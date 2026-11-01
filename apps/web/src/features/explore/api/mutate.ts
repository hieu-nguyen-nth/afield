import { z } from "zod";
import { dbError } from "@/infrastructure/database/errors";
import { usesWeb, requiresSearch } from "@/features/research/source-mode";

import { requireLive } from "@/config/env";
import { AppError } from "@/core/errors";
import { exploreSchema } from "@/features/explore/models";
import { topicSchema } from "@/features/topics/models";
import { conflictingLimit, hash } from "@/core/limits";

import { urlsIn } from "@/features/research/research";
import type { ApiContext } from "@/infrastructure/http/context";
export async function mutateExplore(context: ApiContext) {
  const { req, db, user, parts, body } = context;
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
  throw new AppError("validation_failed", "Unknown endpoint.", 404);
}
