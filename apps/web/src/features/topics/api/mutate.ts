import { z } from "zod";
import { randomUUID } from "node:crypto";
import { dbError } from "@/infrastructure/database/errors";
import { usesWeb, requiresSearch } from "@/features/research/source-mode";

import { requireLive } from "@/config/env";
import { AppError } from "@/core/errors";
import { topicSchema } from "@/features/topics/models";
import type { TopicConfig } from "@/features/topics/models";
import { sourceModeSchema } from "@/features/research/models";
import { hash } from "@/core/limits";
import { nextOccurrence } from "@/features/scheduling/schedule";
import { safeFetch } from "@/infrastructure/network/safe-fetch";
import type { ApiContext } from "@/infrastructure/http/context";
import { uuid } from "@/infrastructure/http/context";
export async function mutateTopics(context: ApiContext) {
  const { req, db, user, parts, body } = context;
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
  throw new AppError("validation_failed", "Unknown endpoint.", 404);
}
