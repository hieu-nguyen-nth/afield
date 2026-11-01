import { z } from "zod";
export const limitSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("words"),
      value: z.union([z.literal(400), z.literal(800), z.literal(1400)]),
    })
    .strict(),
  z
    .object({
      type: z.literal("duration"),
      value: z.number().int().min(60).max(900).multipleOf(60),
    })
    .strict(),
]);
export type OutputLimit = z.infer<typeof limitSchema>;
export const depthSchema = z.enum(["overview", "working", "deep"]);
export const sourceModeSchema = z.enum([
  "sources_only",
  "web_only",
  "sources_and_web",
]);
export type SourceMode = z.infer<typeof sourceModeSchema>;
export const directSourceSchema = z
  .object({
    url: z.url().max(2000),
    name: z.string().max(150).optional(),
    scope: z.enum(["page", "feed", "site", "search"]).default("page"),
  })
  .strict();
export const exploreSchema = z
  .object({
    prompt: z.string().trim().min(1).max(4000),
    preferences: z.string().max(2000).default(""),
    depth: depthSchema.default("working"),
    limit: limitSchema,
    resolvedConflict: z.boolean().default(false),
    sourceMode: sourceModeSchema.default("sources_only"),
    sourceIds: z.array(z.uuid()).max(5).default([]),
    sources: z.array(directSourceSchema).max(5).default([]),
  })
  .strict();
