import { test, expect } from "@playwright/test";
test("compact account controls, section spacing, retry progress and downloadable activity", async ({
  page,
}) => {
  const now = new Date().toISOString();
  let retried = false;
  let polls = 0;
  const run = {
    id: "saved-run",
    intent: "explore",
    status: "failed",
    stage: "failed",
    attempts: 1,
    created_at: now,
    updated_at: now,
    snapshot: { prompt: "Explain payments" },
    error: {
      code: "provider_unavailable",
      message: "The AI service was busy.",
      retryable: true,
    },
    events: [
      {
        id: "event1",
        stage: "writing",
        status: "running",
        created_at: now,
        error_code: null,
      },
    ],
  };
  await page.route("**/api/v1/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/me"))
      return route.fulfill({
        json: {
          user: { id: "fixture", email: "reader@example.test" },
          usage: { runs: 1, limit: 30 },
          capabilities: {
            live: true,
            search: false,
            cloud: false,
            audio: true,
          },
        },
      });
    if (path.endsWith("/briefs")) return route.fulfill({ json: { items: [] } });
    if (path.endsWith("/topics")) return route.fulfill({ json: [] });
    if (path.endsWith("/runs")) return route.fulfill({ json: [run] });
    if (path.endsWith("/retry")) {
      retried = true;
      return route.fulfill({ json: { runId: run.id } });
    }
    if (path.endsWith("/runs/saved-run")) {
      polls++;
      return route.fulfill({
        json: retried
          ? {
              ...run,
              status: "running",
              stage: "writing",
              attempts: 2,
              error: null,
            }
          : run,
      });
    }
    return route.fulfill({ json: [] });
  });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "In your workspace" }),
  ).toBeVisible();
  const sections = page.locator("main > section");
  const previous = await sections.nth(0).boundingBox();
  const next = await sections.nth(1).boundingBox();
  expect(next!.y - (previous!.y + previous!.height)).toBeGreaterThanOrEqual(24);
  await expect(
    page.getByRole("button", { name: "Settings & privacy", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/refined-overview.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Exploration" }).click();
  await expect(
    page.getByRole("heading", { name: "Activity log" }),
  ).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download activity log" }).click();
  expect((await downloadPromise).suggestedFilename()).toContain(
    "afield-request",
  );
  await page.getByRole("button", { name: "Retry this request" }).click();
  await expect(
    page.getByRole("heading", { name: "Writing your brief" }),
  ).toBeVisible();
  expect(polls).toBeGreaterThanOrEqual(2);
  await expect(page.getByText("Estimated window ends in")).toBeVisible();
  await page.screenshot({
    path: "test-results/refined-progress.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("button", { name: "Settings & privacy", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/refined-mobile.png",
    fullPage: true,
  });
});

test("main layouts keep headings inside panels and fit desktop and mobile", async ({
  page,
}) => {
  await page.route("**/api/v1/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/me"))
      return route.fulfill({
        json: {
          user: { id: "fixture", email: "reader@example.test" },
          usage: { runs: 1, limit: 30 },
          capabilities: {
            live: true,
            search: false,
            cloud: false,
            audio: true,
          },
        },
      });
    if (path.endsWith("/briefs")) return route.fulfill({ json: { items: [] } });
    return route.fulfill({ json: [] });
  });
  await page.goto("/");
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    const capture = async (name: string) => {
      await expect(page.locator("main h1").first()).toBeVisible();
      const fits = await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      );
      expect(fits, `${name} fits ${width}px`).toBe(true);
      for (const heading of await page
        .locator(".panel > h2:first-child, .panel > h3:first-child")
        .all()) {
        const gap = await heading.evaluate(
          (el) =>
            el.getBoundingClientRect().top -
            el.parentElement!.getBoundingClientRect().top,
        );
        expect(gap).toBeGreaterThanOrEqual(16);
      }
      await page.screenshot({
        path: `test-results/layout-${name}-${width}.png`,
        fullPage: true,
      });
    };
    await page
      .getByRole("button", { name: "Explore", exact: false })
      .first()
      .click();
    await capture("explore");
    await page
      .getByRole("button", { name: "Stay updated", exact: false })
      .first()
      .click();
    await capture("topics");
    await page.getByRole("button", { name: "New topic", exact: true }).click();
    await capture("topic-editor");
    await expect(page.getByRole("heading", {name:"Topic focus", exact:true})).toBeVisible();
    await expect(page.getByRole("heading", {name:"Reading & delivery", exact:true})).toBeVisible();
    expect(await page.getByLabel("Topic name", {exact:true}).evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(14);
    const gridGap=await page.locator(".topic-settings-panel .form-grid").first().evaluate(el=>parseFloat(getComputedStyle(el).rowGap));
    expect(gridGap).toBe(14);
    const arrowStyle = await page.getByRole("combobox", {name:/^Frequency/}).evaluate(el=>({appearance:getComputedStyle(el).appearance,padding:parseFloat(getComputedStyle(el).paddingRight)}));
    expect(arrowStyle.appearance).toBe("none");
    expect(arrowStyle.padding).toBeGreaterThanOrEqual(32);
    await page
      .getByRole("navigation")
      .getByRole("button", { name: "History", exact: true })
      .click();
    await capture("history");
    await page
      .getByRole("button", { name: "Settings & privacy", exact: true })
      .click();
    await capture("settings");
  }
});
