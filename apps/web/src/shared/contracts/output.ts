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
