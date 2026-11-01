import { expect, it, vi, afterEach } from "vitest";
const mocks = vi.hoisted(() => ({ search: vi.fn(), fetch: vi.fn() }));
vi.mock("@/infrastructure/providers/providers", () => ({
  search: mocks.search,
}));
vi.mock("@/infrastructure/network/safe-fetch", () => ({
  safeFetch: mocks.fetch,
  publicUrl: (v: string) => new URL(v),
  inScope: () => true,
}));
import { research } from "@/features/research/research";
import type { Run } from "@/features/generation/models";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});
it.each([
  ["sources_only", false, true],
  ["web_only", true, false],
  ["sources_and_web", true, true],
])(
  "%s enforces web and configured-source selection",
  async (mode, web, followed) => {
    vi.stubEnv("TAVILY_API_KEY", "synthetic-key");
    mocks.search.mockResolvedValue([
      { url: "https://web.example/article", title: "Web result" },
    ]);
    mocks.fetch.mockImplementation(async (url: string) => ({
      url,
      text:
        "<html><title>Public evidence</title><article>" +
        "A sourced enterprise AI development. ".repeat(12) +
        "</article></html>",
    }));
    const run = {
      intent: "explore",
      snapshot: {
        prompt: "Recent adoption",
        sourceMode: mode,
        sources: [
          {
            url: "https://configured.example/article",
            scope: "page",
            name: "My source",
          },
        ],
      },
    } as unknown as Run;
    const r = await research(run, async () => {});
    expect(mocks.search.mock.calls.length > 0).toBe(web);
    expect(
      mocks.fetch.mock.calls.some(([url]) =>
        String(url).includes("configured.example"),
      ),
    ).toBe(followed);
    expect(r.documents.length).toBe(web && followed ? 2 : 1);
  },
);
