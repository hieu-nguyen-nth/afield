import { test, expect } from "@playwright/test";
test("source rows add immediately, retain methods, delete cleanly and hide in search-only", async ({
  page,
}) => {
  const submissions: {
    sources: { url: string; scope: string }[];
    sourceMode: string;
    key: string;
  }[] = [];
  await page.route("**/api/v1/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/me"))
      return route.fulfill({
        json: {
          user: { id: "fixture", email: "reader@example.test" },
          usage: { runs: 0, limit: 30 },
          capabilities: { live: true, search: true, cloud: false, audio: true },
        },
      });
    if (path.endsWith("/briefs")) return route.fulfill({ json: { items: [] } });
    if (path.endsWith("/explorations/prepare"))
      return route.fulfill({ json: { conflict: false } });
    if (path.endsWith("/explorations")) {
      submissions.push({
        ...route.request().postDataJSON(),
        key: route.request().headers()["idempotency-key"],
      });
      return route.fulfill({
        status: 503,
        json: { error: { message: "Captured test request" } },
      });
    }
    return route.fulfill({ json: [] });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Start exploring" }).click();
  await page.getByLabel("Your question").fill("Enterprise AI career choices");
  const longURL =
    "https://fortune.com/2026/10/28/" + "long-article-title-".repeat(8);
  await page.getByLabel("Source 1 URL").fill(longURL);
  await page.getByRole("button", { name: "Add source", exact: true }).click();
  await expect(page.getByLabel("Source 2 URL")).toBeFocused();
  await page.getByLabel("Source 2 URL").fill("https://stratechery.com/");
  await page.getByLabel("Source 2 reading method").selectOption("search");
  await page.screenshot({
    path: "test-results/compact-source-rows.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Make my brief" }).click();
  await expect.poll(() => submissions.length).toBe(1);
  expect(submissions[0].sources).toEqual([
    { url: longURL, scope: "page" },
    { url: "https://stratechery.com/", scope: "search" },
  ]);
  await page
    .getByRole("button", { name: "Remove source 1", exact: true })
    .click();
  await expect(page.getByLabel("Source 1 URL")).toHaveValue(
    "https://stratechery.com/",
  );
  await expect(page.getByLabel("Source 1 reading method")).toHaveValue(
    "search",
  );
  await page.getByRole("button", { name: "Make my brief" }).click();
  await expect.poll(() => submissions.length).toBe(2);
  expect(submissions[1].key).not.toBe(submissions[0].key);
  await page.getByRole("tab", { name: "Search only", exact: true }).click();
  await expect(page.getByLabel("Source 1 URL")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Add source", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Make my brief" }).click();
  await expect.poll(() => submissions.length).toBe(3);
  expect(submissions[2]).toMatchObject({ sourceMode: "web_only", sources: [] });
  await page
    .getByRole("tab", { name: "My sources + research", exact: true })
    .click();
  await expect(page.getByLabel("Source 1 URL")).toHaveValue(
    "https://stratechery.com/",
  );
  await page.getByRole("button", { name: "Make my brief" }).click();
  await expect.poll(() => submissions.length).toBe(4);
  expect(submissions[3]).toMatchObject({
    sourceMode: "sources_and_web",
    sources: [{ url: "https://stratechery.com/", scope: "search" }],
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByLabel("Source 1 URL")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/compact-source-rows-mobile.png",
    fullPage: true,
  });
});
