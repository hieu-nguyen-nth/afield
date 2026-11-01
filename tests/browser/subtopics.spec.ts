import { test, expect } from "@playwright/test";
async function setup(page: import("@playwright/test").Page) {
  await page.route("**/api/v1/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/me"))
      return route.fulfill({
        json: {
          user: { id: "fixture", email: "reader@example.test" },
          usage: { runs: 0, limit: 30 },
          capabilities: {
            live: true,
            search: false,
            cloud: false,
            audio: true,
          },
        },
      });
    return route.fulfill({
      json: path.endsWith("/briefs") ? { items: [] } : [],
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Stay updated", exact: true }).click();
  await page.getByRole("button", { name: "New topic", exact: true }).click();
}
test("subtopic chips keep selections while regenerating and support deselection", async ({
  page,
}) => {
  await setup(page);
  await expect(
    page.getByRole("button", { name: "Suggest subtopics", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("Topic name", { exact: true }).fill("Enterprise AI");
  await page.getByLabel("New subtopic title").fill("Existing interest");
  await page.getByRole("button", { name: "Add subtopic", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Existing interest", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  let calls = 0;
  let finish: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    finish = resolve;
  });
  const prompts: string[] = [];
  await page.route("**/api/v1/assist/subtopics", async (route) => {
    calls++;
    prompts.push(route.request().postDataJSON().prompt);
    if (calls === 1) await gate;
    await route.fulfill({
      json: {
        subtopics:
          calls === 1
            ? ["AI governance", "Adoption metrics"]
            : ["Model evaluation", "Team workflows"],
        reason: "These cover decision-making and measurement.",
      },
    });
  });
  await page
    .getByRole("button", { name: "Suggest subtopics", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Suggesting subtopics…", exact: true }),
  ).toBeDisabled();
  finish();
  const governance = page.getByRole("button", {
    name: "AI governance",
    exact: true,
  });
  await expect(governance).toHaveAttribute("aria-pressed", "false");
  await governance.click();
  await expect(governance).toHaveAttribute("aria-pressed", "true");
  await expect(governance).toHaveText("AI governance");
  await expect(
    page.getByText("2 / 20 selected", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Regenerate suggestions", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Model evaluation", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  await expect(
    page.getByRole("button", { name: "Adoption metrics", exact: true }),
  ).toHaveCount(0);
  await expect(governance).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("button", { name: "Existing interest", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(prompts[1]).toContain("Existing interest; AI governance");
  expect(calls).toBe(2);
  await page.screenshot({
    path: "test-results/subtopic-selected-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByLabel("Subtopic choices").scrollIntoViewIfNeeded();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.screenshot({ path: "test-results/subtopic-selected-mobile.png" });
  const longTitle =
    "Enterprise AI adoption and regulatory compliance across international financial services teams";
  await page.getByLabel("New subtopic title").fill(longTitle);
  await page.getByRole("button", { name: "Add subtopic", exact: true }).click();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.getByRole("button", { name: longTitle, exact: true }).click();
  await expect(
    page.getByRole("button", { name: longTitle, exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  await page
    .getByRole("button", { name: "Model evaluation", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Model evaluation", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Model evaluation", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  await governance.click();
  await expect(governance).toHaveAttribute("aria-pressed", "false");
  await governance.click();
  await expect(governance).toHaveAttribute("aria-pressed", "true");
  await governance.click();
  await expect(governance).toHaveAttribute("aria-pressed", "false");
  await page.screenshot({ path: "test-results/subtopic-deselected-retained.png" });
  await expect(
    page.getByText("1 / 20 selected", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Topic name", { exact: true }).fill("Different topic");
  await expect(
    page.getByRole("button", { name: "Model evaluation", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Existing interest", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});
test("subtopic provider failures are visible inline and can be retried", async ({
  page,
}) => {
  await setup(page);
  await page.getByLabel("Topic name", { exact: true }).fill("Enterprise AI");
  await page.route("**/api/v1/assist/subtopics", (route) =>
    route.fulfill({
      status: 503,
      json: {
        error: {
          message: "The AI service is temporarily busy. Try again shortly.",
        },
      },
    }),
  );
  await page
    .getByRole("button", { name: "Suggest subtopics", exact: true })
    .click();
  await expect(
    page.locator(".subtopic-suggestions").getByRole("alert"),
  ).toContainText("temporarily busy");
  await expect(
    page.getByRole("button", { name: "Suggest subtopics", exact: true }),
  ).toBeEnabled();
});
