import { z } from "zod";
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
export type Evidence = {
  id: string;
  url: string;
  title: string;
  publisher: string;
  text: string;
  publishedAt: string | null;
  origin: "followed" | "discovered";
  sourceId?: string;
};
export type SourceCheck = {
  scope: string;
  outcome: "success" | "empty" | "blocked" | "failed";
  count: number;
  reason?: string;
};
