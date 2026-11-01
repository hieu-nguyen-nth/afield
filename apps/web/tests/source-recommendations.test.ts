import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  search: vi.fn(),
  gemini: vi.fn(),
  safeFetch: vi.fn(),
}));
vi.mock("../src/infrastructure/providers/providers", () => ({
  search: mocks.search,
  gemini: mocks.gemini,
}));
vi.mock("../src/infrastructure/network/safe-fetch", () => ({
  safeFetch: mocks.safeFetch,
}));
import { recommendSources } from "../src/features/research/source-recommendations";
const quote =
  "We are an independent publication reporting on AI safety research and public policy.";
beforeEach(() => {
  vi.resetAllMocks();
  mocks.safeFetch.mockImplementation(async (url: string) => ({
    url,
    text: `<body>${quote} ${"Detailed learning resources and reporting. ".repeat(10)}</body>`,
  }));
});
it("recommends distinct checked publications rather than articles, duplicate hosts or social posts", async () => {
  mocks.search.mockResolvedValue([
    { url: "https://www.linkedin.com/posts/someone", title: "Personal post" },
    {
      url: "https://institute.example/reports/2026",
      title: "AI safety research updates",
      content: "New research",
    },
    {
      url: "https://institute.example/news/another",
      title: "Duplicate institution",
    },
    { url: "https://news.example/ai/article", title: "AI governance news" },
  ]);
  mocks.gemini.mockResolvedValue({
    sources: [
      {
        index: 0,
        name: "Institute",
        kind: "research_nonprofit",
        publisherEvidence: quote,
        reason: "Research on AI safety.",
      },
      {
        index: 0,
        name: "Duplicate",
        kind: "research_nonprofit",
        publisherEvidence: quote,
        reason: "Duplicate.",
      },
      {
        index: 99,
        name: "Invented",
        kind: "university",
        publisherEvidence: quote,
        reason: "Invalid index.",
      },
      {
        index: 1,
        name: "News",
        kind: "independent_publication",
        publisherEvidence: quote,
        reason: "Covers governance developments.",
      },
    ],
  });
  const result = await recommendSources({
    prompt: "AI safety in financial services",
  });
  expect(
    result.sources.map((source) => [source.url, source.scope, source.status]),
  ).toEqual([
    ["https://institute.example/", "search", "recommended"],
    ["https://news.example/", "search", "recommended"],
  ]);
  expect(mocks.gemini.mock.calls[0][2].candidates).toHaveLength(2);
  expect(mocks.search).toHaveBeenCalledTimes(2);
});
it("returns none rather than falling back to unchecked or invalid publishers", async () => {
  mocks.search.mockResolvedValue([
    { url: "invalid", title: "Bad" },
    { url: "https://reddit.com/post", title: "Post" },
  ]);
  expect(await recommendSources({ prompt: "AI safety" })).toEqual({
    sources: [],
  });
  expect(mocks.gemini).not.toHaveBeenCalled();
});
it("screens vendor sales copy before the model can promote an SEO match", async () => {
  mocks.search.mockResolvedValue([
    {
      url: "https://vendor.example/blog/ai-safety",
      title: "Complete AI safety guide",
    },
    {
      url: "https://trials.example/learning",
      title: "AI risk research",
      content: "Start your free trial",
    },
    { url: "https://journal.example/ai", title: "AI governance analysis" },
  ]);
  mocks.safeFetch.mockImplementation(async (url: string) => ({
    url,
    text: `<body>${quote} ${url.includes("vendor") ? "Book a demo of our AI governance platform." : "Independent journalism and original reporting. ".repeat(8)}</body>`,
  }));
  mocks.gemini.mockResolvedValue({
    sources: [
      {
        index: 0,
        name: "Journal",
        kind: "independent_publication",
        publisherEvidence: quote,
        reason: "AI governance analysis.",
      },
    ],
  });
  expect(
    (await recommendSources({ prompt: "AI safety" })).sources.map(
      (source) => source.url,
    ),
  ).toEqual(["https://journal.example/"]);
  expect(mocks.gemini.mock.calls[0][2].candidates).toHaveLength(1);
});
it("rejects inaccessible publishers and invented publisher evidence", async () => {
  mocks.search.mockResolvedValue([
    { url: "https://journal.example/ai", title: "AI governance" },
    { url: "https://blocked.example/article", title: "Research" },
  ]);
  mocks.safeFetch.mockImplementation(async (url: string) => {
    if (url.includes("blocked")) throw new Error("Blocked");
    return {
      url,
      text: `<body>${quote} ${"Public reporting. ".repeat(12)}</body>`,
    };
  });
  mocks.gemini.mockResolvedValue({
    sources: [
      {
        index: 0,
        name: "Journal",
        kind: "independent_publication",
        publisherEvidence:
          "We are the leading authoritative university research organization.",
        reason: "Research",
      },
    ],
  });
  expect(await recommendSources({ prompt: "AI safety" })).toEqual({
    sources: [],
  });
});
