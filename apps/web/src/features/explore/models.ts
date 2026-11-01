import { z } from "zod";
import { depthSchema, limitSchema } from "@/shared/contracts/output";
import {
  sourceModeSchema,
  directSourceSchema,
} from "@/features/research/models";
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
