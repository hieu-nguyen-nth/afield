import { afterEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ search: vi.fn(), fetch: vi.fn() }));
vi.mock("../src/infrastructure/providers/providers", () => ({
  search: mocks.search,
}));
vi.mock("../src/infrastructure/network/safe-fetch", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("../src/infrastructure/network/safe-fetch")
  >()),
  safeFetch: mocks.fetch,
}));
import { research } from "../src/features/research/research";
import { AppError } from "../src/core/errors";
import type { Run } from "../src/domain/contracts";
const run = {
  intent: "explore",
  snapshot: {
    prompt: "Enterprise AI product strategy",
    preferences: "Career development",
    sourceMode: "sources_only",
    sources: [
      { url: "https://example.com/analysis/", scope: "search" },
      { url: "https://other.example/article", scope: "page" },
    ],
  },
} as unknown as Run;
afterEach(() => {
  vi.resetAllMocks();
  vi.unstubAllEnvs();
});
function setup() {
  vi.stubEnv("TAVILY_API_KEY", "synthetic");
  mocks.fetch.mockImplementation(async (url: string) => ({
    url,
    text: "<article>" + "Supported public evidence. ".repeat(20) + "</article>",
  }));
}
it("per-source search discovers unlinked articles throughout the selected domain and rejects other domains", async () => {
  setup();
  mocks.search.mockResolvedValue([
    { url: "https://example.com/analysis/unlinked-article" },
    { url: "https://example.com/?page=2" },
    { url: "https://evil.example/analysis/article" },
    { url: "https://example.com/analysis-other/article" },
    { url: "https://example.com/analysis/unlinked-article" },
  ]);
  const result = await research(run, async () => {});
  expect(mocks.search).toHaveBeenCalledTimes(1);
  expect(mocks.search).toHaveBeenCalledWith(
    expect.stringContaining("Enterprise AI product strategy"),
    ["example.com"],
  );
  expect(result.documents.map((d) => d.url)).toEqual([
    "https://example.com/analysis/unlinked-article",
    "https://example.com/analysis-other/article",
    "https://other.example/article",
  ]);
  expect(mocks.fetch).not.toHaveBeenCalledWith("https://example.com/analysis/");
  expect(result.checks[0].reason).toContain("Searched example.com");
});
it("runs a fresh site search with the update coverage window for recurring briefs", async () => {
  setup();
  mocks.search.mockResolvedValue([
    { url: "https://example.com/new-development" },
  ]);
  await research(
    {
      ...run,
      intent: "update",
      snapshot: {
        ...run.snapshot,
        coverageStart: "2026-10-24T00:00:00Z",
        coverageEnd: "2026-10-31T23:59:59Z",
        asOf: "2026-10-31T23:59:59Z",
      },
    } as Run,
    async () => {},
  );
  expect(mocks.search).toHaveBeenCalledWith(
    expect.stringContaining("from 2026-10-24 through 2026-10-31"),
    ["example.com"],
  );
});
it("checks redirects against the selected scope and reports unreadable results", async () => {
  setup();
  mocks.search.mockResolvedValue([
    { url: "https://example.com/analysis/article" },
  ]);
  mocks.fetch.mockImplementation(async (url: string) => ({
    url: url.includes("example.com") ? "https://other.example/redirect" : url,
    text: "<article>" + "Public evidence. ".repeat(20) + "</article>",
  }));
  const result = await research(run, async () => {});
  expect(result.documents).toHaveLength(1);
  expect(result.checks.some((check) => check.outcome === "blocked")).toBe(true);
});
it("does not silently fall back when search is unavailable or quota is exhausted", async () => {
  vi.stubEnv("TAVILY_API_KEY", "");
  await expect(research(run, async () => {})).rejects.toMatchObject({
    code: "configuration_invalid",
  });
  setup();
  mocks.search.mockRejectedValue(
    new AppError("quota_exceeded", "No search credits"),
  );
  await expect(research(run, async () => {})).rejects.toMatchObject({
    code: "quota_exceeded",
  });
  expect(mocks.fetch).not.toHaveBeenCalled();
});
it("reports zero results instead of presenting a homepage as a site search", async () => {
  setup();
  mocks.search.mockResolvedValue([]);
  const onlySite = {
    ...run,
    snapshot: {
      ...run.snapshot,
      sources: [{ url: "https://example.com/analysis/", scope: "search" }],
    },
  };
  await expect(research(onlySite as Run, async () => {})).rejects.toMatchObject(
    { code: "insufficient_evidence" },
  );
  expect(mocks.fetch).not.toHaveBeenCalled();
});
