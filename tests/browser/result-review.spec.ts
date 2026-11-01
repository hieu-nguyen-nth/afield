import { test, expect } from "@playwright/test";
test("published retry refreshes overview and exposes original inputs, coverage and usage", async ({
  page,
}) => {
  let published = false;
  const snapshot = {
    prompt: "How should a PM develop their career?",
    preferences: "Enterprise AI adoption",
    depth: "working",
    limit: { type: "words", value: 800 },
    sourceMode: "sources_only",
    sources: [
      { url: "https://fortune.com/article", scope: "page" },
      { url: "https://stratechery.com/", scope: "page" },
    ],
  };
  const brief = {
    id: "brief",
    run_id: "run",
    intent: "explore",
    title: "Career strategy",
    created_at: "2026-11-01T00:25:00Z",
    word_count: 300,
    audio_status: "not_requested",
    budget_status: "met",
    partial: true,
    snapshot,
    summary:
      "Build practical judgment about enterprise adoption and evaluate career tradeoffs.",
    citations: [
      {
        id: "evidence",
        url: "https://fortune.com/article",
        title: "Evidence",
        publisher: "Fortune",
      },
    ],
    content: {
      title: "Career strategy",
      noNews: false,
      limitations: ["Only one selected source was cited."],
      blocks: [
        {
          heading: "Practical choices",
          items: [
            {
              text: "Build practical judgment about enterprise adoption.",
              citationIds: ["evidence"],
            },
          ],
        },
      ],
    },
    sourceChecks: [
      {
        scope: "https://stratechery.com/",
        outcome: "success",
        document_count: 1,
        reason: null,
      },
    ],
  };
  let submitted: Record<string, unknown> | undefined;
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/me"))
      return route.fulfill({
        json: {
          user: { id: "fixture", email: "reader@example.test" },
          usage: {
            runs: 1,
            limit: 30,
            resetsAt: "2026-12-01T00:00:00Z",
            dailyResetsAt: "2026-11-02T00:00:00Z",
            shared: true,
          },
          capabilities: { live: true, search: true, cloud: false, audio: true },
        },
      });
    if (path.endsWith("/topics")) return route.fulfill({ json: [] });
    if (path.endsWith("/briefs"))
      return route.fulfill({ json: { items: published ? [brief] : [] } });
    if (path.endsWith("/briefs/brief")) return route.fulfill({ json: brief });
    if (path.endsWith("/runs"))
      return route.fulfill({
        json: [
          {
            id: "run",
            intent: "explore",
            status: published ? "completed" : "failed",
            stage: published ? "completed" : "failed",
            created_at: brief.created_at,
            attempts: 3,
            snapshot,
          },
        ],
      });
    if (path.endsWith("/runs/run")) {
      published = true;
      return route.fulfill({
        json: {
          id: "run",
          status: "completed",
          stage: "completed",
          brief_id: "brief",
          snapshot,
        },
      });
    }
    if (path.endsWith("/explorations/prepare")) {
      submitted = route.request().postDataJSON();
      return route.fulfill({
        status: 503,
        json: { error: { message: "Captured without submitting live work" } },
      });
    }
    return route.fulfill({ json: [] });
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: /Exploration/ })
    .last()
    .click();
  await expect(
    page.getByRole("heading", { name: "Career strategy", exact: true }),
  ).toBeVisible();
  await page
    .getByText("Original request & source coverage", { exact: true })
    .click();
  await expect(page.getByText(snapshot.prompt, { exact: true })).toBeVisible();
  await expect(page.getByText(/not directly cited/)).toBeVisible();
  await page.screenshot({
    path: "test-results/result-request-coverage.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /Career strategy/ }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Build practical judgment about enterprise adoption and evaluate career tradeoffs.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.getByText("failed", { exact: true })).toHaveCount(0);
  await page.screenshot({
    path: "test-results/result-overview.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Personal account" }).click();
  await expect(
    page.getByRole("heading", { name: "Account & usage", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Monthly reset", { exact: true })).toBeVisible();
  await expect(
    page.getByText(/Retrying the same request reuses that slot/),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/account-usage.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "History", exact: true }).click();
  await page.getByRole("button", { name: /Career strategy/ }).click();
  await page
    .getByText("Original request & source coverage", { exact: true })
    .click();
  await page.getByRole("button", { name: "Revise this exploration" }).click();
  await expect(page.getByLabel("Your question")).toHaveValue(snapshot.prompt);
  await page.getByLabel("Source 2 reading method").selectOption("search");
  await expect(page.getByLabel("Source 1 reading method")).toHaveValue("page");
  await expect(page.getByLabel("Explore URL scope")).toHaveCount(0);
  await page.screenshot({
    path: "test-results/site-search-controls.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Make my brief" }).click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Captured without submitting live work" }),
  ).toContainText("Captured without submitting live work");
  expect(submitted?.sources).toEqual([
    { url: "https://fortune.com/article", scope: "page" },
    { url: "https://stratechery.com/", scope: "search" },
  ]);
});
