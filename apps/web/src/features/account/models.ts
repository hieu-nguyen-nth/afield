import type { AuthIdentity } from "@/features/auth/models";
export type AccountSummary = {
  user: AuthIdentity;
  usage: {
    runs: number;
    limit: number;
    resetsAt?: string;
    dailyResetsAt?: string;
    shared?: boolean;
  };
  capabilities: {
    live: boolean;
    search: boolean;
    cloud: boolean;
    audio: boolean;
  };
};
