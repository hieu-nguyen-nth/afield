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
