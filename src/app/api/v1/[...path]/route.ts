import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import {
  requireUser,
  assertOrigin,
  readJson,
  dbError,
  adminClient,
} from "@/infrastructure/auth/server";
import { usesWeb, requiresSearch } from "@/features/research/source-mode";
import { requireLive } from "@/config/env";
import { AppError, errorBody } from "@/core/errors";
import {
  exploreSchema,
  topicSchema,
  type TopicConfig,
  sourceModeSchema,
} from "@/domain/contracts";
import { conflictingLimit, hash } from "@/core/limits";
import { dayRange, nextOccurrence } from "@/features/scheduling/schedule";
import { safeFetch } from "@/infrastructure/network/safe-fetch";
import { urlsIn } from "@/features/research/research";
import { recommendSources } from "@/features/research/source-recommendations";
import { suggestSubtopics, subtopicInput } from "@/features/research/subtopics";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type Context = { params: Promise<{ path: string[] }> };
const uuid = (s: string) => z.uuid().parse(s);
async function handle(req: Request, { params }: Context) {
  if (req.method !== "GET") assertOrigin(req);
  const { db, user } = await requireUser();
  const parts = (await params).path;
  const url = new URL(req.url);
  const body = req.method === "GET" ? {} : await readJson(req);
  const limited = await db.rpc("rate_limit", {
    p_kind:
      req.method === "GET" ? "read" : parts[0] === "assist" ? "setup" : "write",
  });
  if (limited.error?.message.includes("quota_exceeded"))
    throw new AppError(
      "rate_limited",
      "Afield received too many requests in a short time. Please wait a minute, then refresh. This is separate from your brief allowance.",
      429,
      true,
    );
  dbError(limited.error);
  if (req.method === "GET") {
    if (parts[0] === "me") {
      const usage = await db.rpc("get_usage");
      dbError(usage.error);
      const now = new Date();
      return {
        user: { id: user.id, email: user.email },
        usage: {
          ...(usage.data ?? { runs: 0, limit: 30 }),
          resetsAt: new Date(
            Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
          ).toISOString(),
          dailyResetsAt: new Date(
            Date.UTC(
              now.getUTCFullYear(),
              now.getUTCMonth(),
              now.getUTCDate() + 1,
            ),
          ).toISOString(),
          shared: true,
        },
        capabilities: {
          live:
            process.env.LIVE_GENERATION_ENABLED === "true" &&
            process.env.FREE_TIERS_VERIFIED === "true",
          search: !!process.env.TAVILY_API_KEY,
          cloud: process.env.EXECUTION_MODE === "cloud",
          audio: !!process.env.GEMINI_API_KEY,
        },
      };
    }
    if (parts[0] === "topics") {
      const q = db.from("topics").select("*").eq("owner_id", user.id);
      const result = parts[1]
        ? await q.eq("id", uuid(parts[1])).maybeSingle()
        : await q.order("created_at", { ascending: false });
      dbError(result.error);
      if (parts[1] && !result.data)
        throw new AppError("not_authorized", "This topic is unavailable.", 404);
      return result.data;
    }
    if (parts[0] === "runs") {
      const result = parts[1]
        ? await db
            .from("runs")
            .select(
              "id,intent,topic_id,trigger,status,stage,error,created_at,updated_at,attempts,snapshot,next_eligible_at",
            )
            .eq("id", uuid(parts[1]))
            .eq("owner_id", user.id)
            .maybeSingle()
        : await db
            .from("runs")
            .select(
              "id,intent,topic_id,status,stage,error,created_at,next_eligible_at,attempts,snapshot",
            )
            .eq("owner_id", user.id)
            .order("created_at", { ascending: false })
            .limit(30);
      dbError(result.error);
      if (parts[1] && !result.data)
        throw new AppError("not_authorized", "This run is unavailable.", 404);
      if (parts[1]) {
        const events = await db
          .from("run_events")
          .select("id,stage,status,created_at,error_code")
          .eq("run_id", parts[1])
          .eq("owner_id", user.id)
          .order("created_at", { ascending: false })
          .limit(60);
        dbError(events.error);
        const brief = await db
          .from("briefs")
          .select("id")
          .eq("run_id", parts[1])
          .eq("owner_id", user.id)
          .maybeSingle();
        return {
          ...result.data,
          brief_id: brief.data?.id ?? null,
          events: (events.data ?? []).reverse(),
        };
      }
      return result.data;
    }
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
          throw new AppError(
            "not_authorized",
            "This brief is unavailable.",
            404,
          );
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
    if (parts[0] === "export") {
      const tables = [
        "topics",
        "sources",
        "templates",
        "schedules",
        "runs",
        "briefs",
        "brief_items",
        "citations",
        "documents",
        "source_checks",
        "review_records",
      ];
      const data: Record<string, unknown> = {
        version: 1,
        exportedAt: new Date().toISOString(),
        owner: user.id,
        mediaInstructions:
          "Download selected narration from each brief. This JSON contains no credentials or playback tokens.",
      };
      for (const t of tables) {
        const result = await db
          .from(t)
          .select(
            t === "runs"
              ? "id,owner_id,topic_id,intent,trigger,snapshot,status,stage,error,created_at"
              : "*",
          )
          .eq("owner_id", user.id)
          .limit(1000);
        dbError(result.error);
        data[t] = result.data;
      }
      return NextResponse.json(data, {
        headers: {
          "Content-Disposition": 'attachment; filename="afield-export.json"',
          "Cache-Control": "no-store",
        },
      });
    }
    throw new AppError("validation_failed", "Unknown endpoint.", 404);
  }
  if (parts[0] === "explorations") {
    const input = exploreSchema.parse(body),
      conflict = conflictingLimit(
        `${input.prompt} ${input.preferences}`,
        input.limit,
      );
    if (
      requiresSearch(input.sourceMode, input.sources) &&
      !process.env.TAVILY_API_KEY
    )
      throw new AppError(
        "configuration_invalid",
        "Search is unavailable right now. Change this source to an exact page, feed or linked pages.",
        503,
      );
    if (parts[1] === "prepare")
      return {
        conflict,
        reason: conflict
          ? "The selected control differs from a word/time limit in your request. Confirm which limit to use."
          : null,
      };
    if (conflict && !input.resolvedConflict)
      throw new AppError(
        "validation_failed",
        "Resolve the conflicting length or time instruction first.",
      );
    requireLive();
    if (usesWeb(input.sourceMode) && !process.env.TAVILY_API_KEY)
      throw new AppError(
        "configuration_invalid",
        "Connect Tavily for this mode, or choose My sources only.",
      );
    const resolvedSources = [...input.sources];
    if (input.sourceMode !== "web_only" && input.sourceIds.length) {
      const owned = await db
        .from("topics")
        .select("config")
        .eq("owner_id", user.id);
      dbError(owned.error);
      const available = (owned.data ?? []).flatMap((t) =>
        topicSchema
          .parse(t.config)
          .sources.filter((s) => s.status === "approved"),
      );
      for (const id of input.sourceIds) {
        const source = available.find((s) => s.id === id);
        if (!source)
          throw new AppError(
            "not_authorized",
            "A selected source is unavailable.",
            404,
          );
        resolvedSources.push({
          url: source.url,
          name: source.name,
          scope: source.scope,
        });
      }
    }
    if (
      requiresSearch(input.sourceMode, resolvedSources) &&
      !process.env.TAVILY_API_KEY
    )
      throw new AppError(
        "configuration_invalid",
        "A selected source needs site search, which is unavailable right now.",
        503,
      );
    if (
      input.sourceMode === "sources_only" &&
      !resolvedSources.length &&
      !urlsIn(input.prompt).length
    )
      throw new AppError(
        "configuration_invalid",
        "Add a public URL or select one of your approved saved sources.",
      );
    if (resolvedSources.length > 5)
      throw new AppError(
        "validation_failed",
        "Choose at most five sources for this exploration.",
      );
    const acceptedInput = {
      ...input,
      sources: input.sourceMode === "web_only" ? [] : resolvedSources,
      sourceIds: input.sourceMode === "web_only" ? [] : input.sourceIds,
    };
    const key = z
      .string()
      .min(8)
      .max(200)
      .parse(req.headers.get("Idempotency-Key"));
    const result = await db.rpc("accept_run", {
      p_intent: "explore",
      p_topic: null,
      p_input: acceptedInput,
      p_key: key,
      p_hash: hash(JSON.stringify(acceptedInput)),
    });
    dbError(result.error);
    return { runId: result.data };
  }
  if (parts[0] === "topics") {
    if (parts[1] === "from-exploration") {
      const id = z.object({ briefId: z.uuid() }).strict().parse(body).briefId;
      const result = await db
        .from("briefs")
        .select("title,snapshot,citations")
        .eq("id", id)
        .eq("owner_id", user.id)
        .eq("intent", "explore")
        .single();
      dbError(result.error);
      if (!result.data)
        throw new AppError(
          "not_authorized",
          "This exploration is unavailable.",
          404,
        );
      return {
        origin: id,
        prompt: result.data.title,
        preferences: result.data.snapshot.preferences,
        sources: result.data.citations.map(
          (s: { url: string; title: string }) => ({
            url: s.url,
            name: s.title,
            scope: "page",
            status: "recommended",
            rationale:
              "Retrieved for the original exploration; review before approving.",
          }),
        ),
      };
    }
    if (parts[2] === "updates") {
      requireLive();
      const key = z
        .string()
        .min(8)
        .max(200)
        .parse(req.headers.get("Idempotency-Key"));
      const id = uuid(parts[1]);
      const options = z
        .object({ sourceMode: sourceModeSchema.optional() })
        .strict()
        .parse(body);
      const topic = await db
        .from("topics")
        .select("config")
        .eq("id", id)
        .eq("owner_id", user.id)
        .single();
      dbError(topic.error);
      if (!topic.data)
        throw new AppError("not_authorized", "This topic is unavailable.", 404);
      const topicConfig = topicSchema.parse(topic.data.config);
      const effectiveMode =
        options.sourceMode ||
        (topicConfig.researchPolicy === "approved_plus_discovery"
          ? "sources_and_web"
          : "sources_only");
      if (
        requiresSearch(
          effectiveMode,
          topicConfig.sources.filter((source) => source.status === "approved"),
        ) &&
        !process.env.TAVILY_API_KEY
      )
        throw new AppError(
          "configuration_invalid",
          "A selected source needs search, which is unavailable right now.",
          503,
        );
      if (
        options.sourceMode &&
        usesWeb(options.sourceMode) &&
        !process.env.TAVILY_API_KEY
      )
        throw new AppError(
          "configuration_invalid",
          "Connect Tavily for this mode, or choose My sources only.",
        );
      const result = await db.rpc("accept_run", {
        p_intent: "update",
        p_topic: id,
        p_input: options,
        p_key: key,
        p_hash: hash(JSON.stringify({ id, ...options })),
      });
      dbError(result.error);
      return { runId: result.data };
    }
    if (
      parts[2] === "activate" ||
      parts[2] === "resume" ||
      parts[2] === "pause"
    ) {
      const t = await db
        .from("topics")
        .select("config")
        .eq("id", uuid(parts[1]))
        .eq("owner_id", user.id)
        .single();
      dbError(t.error);
      if (!t.data)
        throw new AppError("not_authorized", "This topic is unavailable.", 404);
      const config = topicSchema.parse(t.data.config);
      if (parts[2] !== "pause") {
        if (
          requiresSearch(
            config.researchPolicy === "approved_plus_discovery"
              ? "sources_and_web"
              : "sources_only",
            config.sources.filter((source) => source.status === "approved"),
          ) &&
          !process.env.TAVILY_API_KEY
        )
          throw new AppError(
            "configuration_invalid",
            "Search must be connected before activating a topic with site-search sources.",
            503,
          );
        let accessible = false;
        for (const source of config.sources.filter(
          (s) => s.status === "approved",
        )) {
          try {
            await safeFetch(source.url);
            accessible = true;
          } catch {}
        }
        if (!accessible)
          throw new AppError(
            "configuration_invalid",
            "Approve at least one accessible public source before activation.",
          );
      }
      const r = await db.rpc("topic_action", {
        p_id: parts[1],
        p_action: parts[2],
        p_next: parts[2] === "pause" ? null : nextOccurrence(config.schedule),
      });
      dbError(r.error);
      return { ok: true };
    }
    const payload = z
      .object({ config: topicSchema, origin: z.uuid().nullable().optional() })
      .strict()
      .parse(body);
    const config: TopicConfig = {
      ...payload.config,
      sources: payload.config.sources.map((s) => ({
        ...s,
        id: s.id ?? randomUUID(),
      })),
      templates: payload.config.templates.map((t) => ({
        ...t,
        id: t.id ?? randomUUID(),
      })),
    };
    const r = await db.rpc("save_topic", {
      p_id: parts[1] ? uuid(parts[1]) : null,
      p_config: config,
      p_origin: payload.origin ?? null,
    });
    dbError(r.error);
    const saved = await db
      .from("topics")
      .select("status")
      .eq("id", r.data)
      .eq("owner_id", user.id)
      .single();
    if (saved.data?.status === "active") {
      const updated = await db.rpc("topic_action", {
        p_id: r.data,
        p_action: "resume",
        p_next: nextOccurrence(config.schedule),
      });
      dbError(updated.error);
    }
    return { id: r.data };
  }
  if (parts[0] === "runs" && parts[2] === "retry") {
    requireLive();
    const r = await db.rpc("retry_run", { p_id: uuid(parts[1]) });
    dbError(r.error);
    return { runId: parts[1] };
  }
  if (parts[0] === "briefs" && parts[2] === "review") {
    const review = z
      .object({
        score: z.number().int().min(1).max(5),
        notes: z.string().max(4000).default(""),
      })
      .strict()
      .parse(body);
    const r = await db.rpc("save_review", {
      p_brief: uuid(parts[1]),
      p_score: review.score,
      p_notes: review.notes,
    });
    dbError(r.error);
    return { ok: true };
  }
  if (
    parts[0] === "briefs" &&
    parts[2] === "audio" &&
    ["generate", "retry"].includes(parts[3])
  ) {
    requireLive();
    const r = await db.rpc("request_audio", { p_brief: uuid(parts[1]) });
    dbError(r.error);
    return r.data;
  }
  if (parts[0] === "sources" && parts[1] === "check") {
    const { url: source } = z
      .object({ url: z.url().max(2000) })
      .strict()
      .parse(body);
    const result = await safeFetch(source);
    return {
      accessible: true,
      url: result.url,
      scope:
        "Verified public retrieval; expertise is not established by accessibility.",
    };
  }
  if (parts[0] === "assist") {
    requireLive();
    const input = subtopicInput.parse(body);
    if (parts[1] === "sources") {
      return recommendSources(input);
    }
    if (parts[1] === "subtopics") return suggestSubtopics(input);
    throw new AppError("validation_failed", "Unknown suggestion request.", 404);
  }
  if (parts[0] === "account" && parts[1] === "delete") {
    z.object({ confirmation: z.literal("DELETE MY ACCOUNT") })
      .strict()
      .parse(body);
    const r = await db.rpc("request_deletion");
    dbError(r.error);
    await db.auth.signOut({ scope: "global" });
    return { requested: true };
  }
  throw new AppError("validation_failed", "Unknown endpoint.", 404);
}
async function response(req: Request, ctx: Context) {
  try {
    const result = await handle(req, ctx);
    return result instanceof Response
      ? result
      : NextResponse.json(result, {
          status:
            result && typeof result === "object" && "runId" in result
              ? 202
              : 200,
          headers: { "Cache-Control": "private, no-store" },
        });
  } catch (e) {
    return NextResponse.json(
      e instanceof z.ZodError
        ? {
            error: {
              code: "validation_failed",
              message: e.issues[0]?.message ?? "Review the inputs.",
              retryable: false,
            },
          }
        : errorBody(e),
      {
        status:
          e instanceof AppError
            ? e.status
            : e instanceof z.ZodError
              ? 400
              : 500,
      },
    );
  }
}
export {
  response as GET,
  response as POST,
  response as PATCH,
  response as DELETE,
};
