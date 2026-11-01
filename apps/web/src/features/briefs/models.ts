import { z } from "zod";
import type { Run } from "@/features/generation/models";
import type { Evidence } from "@/features/research/models";
export const contentSchema = z.object({
  title: z.string().min(1).max(240),
  noNews: z.boolean(),
  limitations: z.array(z.string().max(1000)).max(8),
  blocks: z
    .array(
      z.object({
        heading: z.string().max(100),
        items: z
          .array(
            z.object({
              text: z.string().min(1).max(12000),
              citationIds: z.array(z.string()).max(12),
              eventKey: z.string().max(200).optional(),
              change: z.string().max(1000).optional(),
            }),
          )
          .max(5),
      }),
    )
    .min(1)
    .max(8),
});
export type Content = z.infer<typeof contentSchema>;
export type Brief = {
  sourceChecks?: {
    scope: string;
    outcome: string;
    document_count: number;
    reason: string | null;
    checked_at: string;
  }[];
  id: string;
  run_id: string;
  topic_id: string | null;
  intent: string;
  title: string;
  content: Content;
  canonical_text: string;
  text_hash: string;
  word_count: number;
  budget_status: string;
  audio_status: string;
  audio_error?: string;
  selected_audio_id: string | null;
  partial: boolean;
  created_at: string;
  snapshot: Run["snapshot"];
  citations: Evidence[];
};

export type BriefRow = { summary?: string } & Pick<
  Brief,
  | "id"
  | "intent"
  | "topic_id"
  | "title"
  | "created_at"
  | "word_count"
  | "audio_status"
  | "budget_status"
  | "snapshot"
  | "partial"
>;
