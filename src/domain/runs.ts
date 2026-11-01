import type { OutputLimit } from "./inputs";
import type { TopicConfig } from "./topics";
export type Run = {
  id: string;
  owner_id: string;
  topic_id: string | null;
  intent: "explore" | "update";
  trigger: "manual" | "scheduled";
  snapshot: {
    prompt: string;
    preferences: string;
    depth: string;
    limit: OutputLimit;
    topic?: TopicConfig;
    asOf: string;
    coverageStart?: string;
    coverageEnd?: string;
    profile: string;
    version: number;
    [key: string]: unknown;
  };
  status: string;
  stage: string;
  created_at: string;
  error: { code: string; message: string; retryable: boolean } | null;
  updated_at?: string;
  attempts?: number;
  events?: {
    id: string;
    stage: string;
    status: string;
    created_at: string;
    error_code: string | null;
  }[];
  lease_token?: string;
  brief_id?: string;
  next_eligible_at?: string | null;
  draft?: Record<string, unknown>;
};
