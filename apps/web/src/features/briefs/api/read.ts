import { z } from "zod";
import { dbError } from "@/infrastructure/database/errors";
import { adminClient } from "@/infrastructure/database/database";
import { AppError } from "@/core/errors";
import { dayRange } from "@/features/scheduling/schedule";
import type { ApiContext } from "@/infrastructure/http/context";
import { uuid } from "@/infrastructure/http/context";
export async function readBriefs(context: ApiContext) {
  const { db, user, parts, url } = context;
  if (parts[0] === "briefs") {
    if (parts[1]) {
      const b = await db
        .from("briefs")
        .select("*")
        .eq("id", uuid(parts[1]))
        .eq("owner_id", user.id)
        .maybeSingle();
      dbError(b.error);
      if (!b.data)
        throw new AppError("not_authorized", "This brief is unavailable.", 404);
      if (parts[2] === "audio") {
        if (!b.data.selected_audio_id)
          throw new AppError(
            "audio_failed",
            "Verified audio is not ready.",
            409,
          );
        const admin = adminClient();
        const a = await admin
          .from("audio_assets")
          .select("*")
          .eq("id", b.data.selected_audio_id)
          .eq("owner_id", user.id)
          .eq("run_id", b.data.run_id)
          .eq("text_hash", b.data.text_hash)
          .eq("status", "ready")
          .single();
        if (a.error || !a.data)
          throw new AppError(
            "audio_failed",
            "Audio could not be verified.",
            409,
          );
        const signed = await admin.storage
          .from("brief-audio")
          .createSignedUrl(a.data.storage_path, 600);
        dbError(signed.error);
        return { url: signed.data!.signedUrl, duration: a.data.duration };
      }
      const coverage = await db
        .from("source_checks")
        .select("scope,outcome,document_count,reason,checked_at")
        .eq("run_id", b.data.run_id)
        .eq("owner_id", user.id)
        .order("checked_at", { ascending: true });
      dbError(coverage.error);
      return { ...b.data, sourceChecks: coverage.data ?? [] };
    }
    let q = db
      .from("briefs")
      .select(
        "id,intent,topic_id,title,created_at,word_count,audio_status,budget_status,snapshot,partial,content",
      )
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(31);
    if (url.searchParams.has("topic"))
      q = q.eq("topic_id", uuid(url.searchParams.get("topic")!));
    if (url.searchParams.has("intent"))
      q = q.eq(
        "intent",
        z.enum(["explore", "update"]).parse(url.searchParams.get("intent")),
      );
    if (url.searchParams.get("date")) {
      const date = z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .parse(url.searchParams.get("date"));
      const zone = url.searchParams.get("timezone") || "America/Los_Angeles";
      const { start, end } = dayRange(date, zone);
      q = q.gte("created_at", start).lt("created_at", end);
    }
    if (url.searchParams.get("cursor")) {
      const c = z
        .object({ at: z.iso.datetime({ offset: true }), id: z.uuid() })
        .parse(
          JSON.parse(
            Buffer.from(
              url.searchParams.get("cursor")!.slice(0, 500),
              "base64url",
            ).toString(),
          ),
        );
      q = q.or(
        `created_at.lt.${c.at},and(created_at.eq.${c.at},id.lt.${c.id})`,
      );
    }
    const result = await q;
    dbError(result.error);
    const rows = result.data ?? [],
      last = rows[29];
    return {
      items: rows.slice(0, 30).map(({ content, ...brief }) => ({
        ...brief,
        summary: (
          content?.blocks
            ?.flatMap((block: { items: { text: string }[] }) => block.items)
            .map((item: { text: string }) => item.text)
            .join(" ") || ""
        ).slice(0, 260),
      })),
      cursor:
        rows.length > 30
          ? Buffer.from(
              JSON.stringify({ at: last.created_at, id: last.id }),
            ).toString("base64url")
          : null,
    };
  }
  throw new AppError("validation_failed", "Unknown endpoint.", 404);
}
