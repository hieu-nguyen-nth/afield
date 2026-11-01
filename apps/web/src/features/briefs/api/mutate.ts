import { z } from "zod";
import { dbError } from "@/infrastructure/database/errors";
import { requireLive } from "@/config/env";
import type { ApiContext } from "@/infrastructure/http/context";
import { uuid } from "@/infrastructure/http/context";
import { AppError } from "@/core/errors";
export async function mutateBriefs(context: ApiContext) {
  const { db, parts, body } = context;
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
  throw new AppError("validation_failed", "Unknown endpoint.", 404);
}
