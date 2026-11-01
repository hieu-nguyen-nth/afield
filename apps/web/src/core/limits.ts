import { createHash } from "node:crypto";
import { AppError } from "./errors";
import type { Content } from "@/features/briefs/models";
import type { Evidence } from "@/features/research/models";
import type { OutputLimit } from "@/shared/contracts/output";
export function prose(content: Content) {
  return [
    ...content.blocks.flatMap((b) => [
      b.heading,
      ...b.items.map((i) => i.text),
    ]),
    ...content.limitations,
  ].join("\n\n");
}
export function words(s: string) {
  return s.trim().match(/\S+/g)?.length ?? 0;
}
export function hash(s: string) {
  return createHash("sha256").update(s).digest("hex");
}
export function verifyContent(
  content: Content,
  evidence: Evidence[],
  limit: OutputLimit,
  intent: string,
) {
  const ids = new Set(evidence.map((d) => d.id));
  if (!content.blocks.some((b) => b.items.length))
    throw new AppError(
      "evidence_validation_failed",
      "The brief must contain a supported answer.",
    );
  if (intent === "explore" && content.noNews)
    throw new AppError(
      "evidence_validation_failed",
      "An exploration must answer the question, not report quiet news.",
    );
  for (const b of content.blocks)
    for (const item of b.items) {
      if (
        !item.citationIds.length ||
        item.citationIds.some((id) => !ids.has(id))
      )
        throw new AppError(
          "evidence_validation_failed",
          "Some claims lack retrieved supporting evidence.",
        );
      if (/https?:\/\//i.test(item.text))
        throw new AppError(
          "evidence_validation_failed",
          "Use validated citation references rather than generated links.",
        );
    }
  if (limit.type === "words" && words(prose(content)) > limit.value)
    throw new AppError(
      "budget_not_met",
      "The draft exceeds the requested word ceiling.",
    );
}
export function conflictingLimit(prompt: string, limit: OutputLimit) {
  const minutes = [...prompt.matchAll(/\b(\d+)\s*(?:minutes?|mins?)\b/gi)].map(
    (x) => Number(x[1]) * 60,
  );
  const counts = [...prompt.matchAll(/\b(\d+)\s*words?\b/gi)].map((x) =>
    Number(x[1]),
  );
  return (
    minutes.some((v) => limit.type !== "duration" || v !== limit.value) ||
    counts.some((v) => limit.type !== "words" || v !== limit.value)
  );
}
