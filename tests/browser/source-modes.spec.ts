import { test, expect } from "@playwright/test";
const topic = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "AI adoption",
  status: "active",
  config: {
    goal: "Track adoption",
    preferences: "",
    depth: "working",
    subtopics: [],
    researchPolicy: "approved_only",
    activeTemplateIndex: 0,
    templates: [
      {
        name: "Default",
        tone: "Clear",
        limit: { type: "words", value: 400 },
        blocks: ["Main developments", "Sources"],
      },
    ],
    schedule: {
      cadence: "weekly",
      weekday: 1,
      time: "08:00",
      timezone: "America/Los_Angeles",
    },
    sources: [
      {
        id: "22222222-2222-4222-8222-222222222222",
        name: "My feed",
        url: "https://configured.example/feed",
        scope: "feed",
        status: "approved",
      },
    ],
  },
};
async function setup(page: import("@playwright/test").Page) {
  await page.route("**/api/v1/**", (r) => {
    const p = new URL(r.request().url()).pathname;
    if (p.endsWith("/me"))
      return r.fulfill({
        json: {
          user: { id: topic.id, email: "reader@example.test" },
          usage: { runs: 0, limit: 30 },
          capabilities: { live: true, search: true, cloud: false, audio: true },
        },
      });
    if (p.endsWith("/topics")) return r.fulfill({ json: [topic] });
    if (p.endsWith("/briefs"))
      return r.fulfill({ json: { items: [], cursor: null } });
    if (p.endsWith("/runs")) return r.fulfill({ json: [] });
    return r.fulfill({
      status: 404,
      json: { error: { message: "Fixture unavailable" } },
    });
  });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Make room for curiosity." }),
  ).toBeVisible();
}
test("phased Explore source controls default to no search and web-only excludes chosen sources", async ({
  page,
}) => {
  await setup(page);
  await page.getByRole("button", { name: "Start exploring" }).click();
  await expect(
    page.getByRole("tab", { name: "Use my sources only", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page
    .getByLabel("Your question")
    .fill("Enterprise AI adoption in the last few days");
  await page.getByText("Choose saved sources", { exact: true }).click();
  await page
    .getByLabel("Saved sources", { exact: true })
    .selectOption(topic.config.sources[0].id);
  let accepted: Record<string, unknown> | undefined;
  await page.route("**/api/v1/explorations/prepare", (r) =>
    r.fulfill({ json: { conflict: false } }),
  );
  await page.route("**/api/v1/explorations", (r) => {
    accepted = r.request().postDataJSON();
    return r.fulfill({
      status: 503,
      json: {
        error: { message: "Stopped before generation for fixture check" },
      },
    });
  });
  await page.getByRole("button", { name: "Make my brief" }).click();
  await expect.poll(() => accepted?.sourceMode).toBe("sources_only");
  expect(accepted?.sourceIds).toEqual([topic.config.sources[0].id]);
  await page.getByRole("tab", { name: "Search only", exact: true }).click();
  await expect(page.getByLabel("Source 1 URL")).toHaveCount(0);
  await page.getByRole("button", { name: "Make my brief" }).click();
  await expect.poll(() => accepted?.sourceMode).toBe("web_only");
  expect(accepted?.sourceIds).toEqual([]);
  expect(accepted?.sources).toEqual([]);
});
test("onboarding manually checks a feed without searching or auto approving", async ({
  page,
}) => {
  await setup(page);
  await page
    .getByRole("button", { name: "Stay updated", exact: false })
    .first()
    .click();
  await page.getByRole("button", { name: "New topic", exact: true }).click();
  await page.getByRole("button", { name: "Manage sources" }).click();
  let searches = 0;
  await page.route("**/api/v1/assist/sources", (r) => {
    searches++;
    return r.fulfill({ json: { sources: [] } });
  });
  await page.route("**/api/v1/sources/check", (r) =>
    r.fulfill({ json: { url: "https://example.com/feed", accessible: true } }),
  );
  await page.getByText("Add a source yourself", { exact: true }).click();
  await page.getByLabel("New source name").fill("My publication");
  await page
    .getByRole("button", { name: "New source scope", exact: true })
    .click();
  await page.getByRole("option", { name: /RSS \/ Atom feed/ }).click();
  await page.getByLabel("New source URL").fill("https://example.com/feed");
  await page.getByRole("button", { name: "Check and add source" }).click();
  await expect(page.getByText("My publication", { exact: true })).toBeVisible();
  await expect(
    page.getByLabel("Use source", { exact: true }),
  ).not.toBeChecked();
  expect(searches).toBe(0);
});
