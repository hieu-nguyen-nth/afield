import { z } from "zod";
import { depthSchema, limitSchema } from "@/shared/contracts/output";
export const scheduleSchema = z
  .object({
    cadence: z.enum(["daily", "weekly"]),
    weekday: z.number().int().min(1).max(7).default(1),
    time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    timezone: z.string().refine((v) => {
      try {
        new Intl.DateTimeFormat("en", { timeZone: v });
        return true;
      } catch {
        return false;
      }
    }, "Use a valid named timezone"),
  })
  .strict();
export const blockTypes = [
  "Big picture",
  "Main developments",
  "Emerging signals",
  "What to watch",
  "Sources",
  "From your sources",
  "Technical deep dive",
  "Recommended reading",
] as const;
export const templateSchema = z
  .object({
    id: z.uuid().optional(),
    name: z.string().trim().min(1).max(100),
    tone: z.string().max(200).default("Clear and thoughtful"),
    limit: limitSchema,
    blocks: z
      .array(z.enum(blockTypes))
      .min(1)
      .max(8)
      .refine(
        (v) => new Set(v).size === v.length && v.some((b) => b !== "Sources"),
        "Select at least one content block without duplicates",
      ),
  })
  .strict();
export const sourceSchema = z
  .object({
    id: z.uuid().optional(),
    url: z.url().max(2000),
    name: z.string().trim().min(1).max(150),
    scope: z.enum(["page", "feed", "site", "search"]),
    status: z.enum(["recommended", "approved", "disabled", "removed"]),
    rationale: z
      .string()
      .max(2000)
      .default("Expertise provenance unknown; review before approval."),
  })
  .strict();
export const topicSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    goal: z.string().trim().min(1).max(1000),
    preferences: z.string().max(2000).default(""),
    depth: depthSchema,
    subtopics: z.array(z.string().trim().min(1).max(100)).max(20),
    researchPolicy: z.enum(["approved_only", "approved_plus_discovery"]),
    sources: z
      .array(sourceSchema)
      .max(10)
      .refine((s) => s.filter((x) => x.status === "approved").length <= 5),
    templates: z.array(templateSchema).min(1).max(10),
    activeTemplateIndex: z.number().int().min(0).max(9),
    schedule: scheduleSchema,
  })
  .strict()
  .refine(
    (v) => v.activeTemplateIndex < v.templates.length,
    "Choose a saved template",
  );
export type TopicConfig = z.infer<typeof topicSchema>;

export type Topic = {
  id: string;
  name: string;
  config: TopicConfig;
  status: string;
  pause_reason: string | null;
};
