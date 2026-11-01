import {
  sourceModeSchema,
  directSourceSchema,
} from "@/features/research/models";
import type { Run } from "@/features/generation/models";
import { z } from "zod";
export function runSourceMode(snapshot: Run["snapshot"]) {
  return sourceModeSchema.parse(
    snapshot.sourceMode ??
      (snapshot.topic?.researchPolicy === "approved_plus_discovery"
        ? "sources_and_web"
        : "sources_only"),
  );
}
export function usesWeb(mode: string) {
  return mode === "web_only" || mode === "sources_and_web";
}
export function requiresSearch(mode: string, sources: { scope: string }[]) {
  return usesWeb(mode) || sources.some((source) => source.scope === "search");
}
export function configuredSources(run: Run) {
  if (runSourceMode(run.snapshot) === "web_only") return [];
  if (run.snapshot.sources)
    return z
      .array(directSourceSchema)
      .max(10)
      .parse(run.snapshot.sources)
      .map((s) => ({ ...s, name: s.name || new URL(s.url).hostname }));
  return (
    run.snapshot.topic?.sources.filter((s) => s.status === "approved") ?? []
  );
}
