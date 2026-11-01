import { expect, it } from "vitest";
import { rankedSiteLinks } from "@/features/research/research";
it("prefers relevant public article links over unrelated navigation in site scope", () => {
  const links = rankedSiteLinks(
    [
      { url: "https://example.com/subscribe/", text: "AI" },
      { url: "https://example.com/about/", text: "About" },
      {
        url: "https://example.com/2026/ai-enterprise/",
        text: "AI enterprise adoption and product strategy",
      },
      { url: "https://example.com/2026/sports/", text: "Sports" },
    ],
    "Product manager AI enterprise adoption",
  );
  expect(links[0]).toBe("https://example.com/2026/ai-enterprise/");
  expect(links).not.toContain("https://example.com/subscribe/");
});
