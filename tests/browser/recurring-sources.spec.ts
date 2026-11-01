import { test, expect } from "@playwright/test";
test("recurring source suggestions use compact publication rows and explicit selection", async ({
  page,
}) => {
  let prompt = "";
  let saved: { sources: { scope: string; status: string }[] } | undefined;
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
    if (path.endsWith("/assist/sources")) {
      prompt = route.request().postDataJSON().prompt;
      return route.fulfill({
        json: {
          sources: [
            {
              url: "https://institute.example/",
              name: "AI Research Institute",
              scope: "search",
              status: "recommended",
              rationale: "Research on model safety and evaluation.",
            },
            {
              url: "https://regulator.example/",
              name: "Financial Regulator",
              scope: "search",
              status: "recommended",
              rationale: "Policy updates about AI risk in finance.",
            },
          ],
        },
      });
    }
    if (path.endsWith("/topics") && route.request().method() === "POST") {
      saved = route.request().postDataJSON().config;
      return route.fulfill({
        status: 503,
        json: { error: { message: "Captured fixture" } },
      });
    }
    return route.fulfill({
      json: path.endsWith("/briefs") ? { items: [] } : [],
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Stay updated", exact: true }).click();
  await page.getByRole("button", { name: "New topic", exact: true }).click();
  await page
    .getByRole("button", { name: "Manage sources", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Suggest recurring sources",
      exact: true,
    }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Suggest recurring sources", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Add a topic name or learning goal in Settings first",
  );
  expect(prompt).toBe("");
  await page
    .locator(".source-prerequisite")
    .getByRole("button", { name: "Settings", exact: true })
    .click();
  await page.getByLabel("Topic name", { exact: true }).fill("AI governance");
  await page
    .getByLabel("Learning goal", { exact: true })
    .fill("Follow AI safety in finance");
  await page
    .getByRole("button", { name: "Manage sources", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Suggest recurring sources", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "AI Research Institute", exact: true }),
  ).toBeVisible();
  expect(prompt).toContain("Topic: AI governance");
  expect(prompt).not.toContain("Regulatory compliance");
  await page
    .locator(".source-prerequisite")
    .getByRole("button", { name: "Settings", exact: true })
    .click();
  await page.getByLabel("New subtopic title").fill("Regulatory compliance");
  await page.getByRole("button", { name: "Add subtopic", exact: true }).click();
  await page
    .getByRole("button", { name: "Manage sources", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Suggest recurring sources", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "AI Research Institute", exact: true }),
  ).toHaveAttribute("href", "https://institute.example/");
  expect(prompt).toContain("Regulatory compliance");
  await expect(
    page.getByRole("button", {
      name: "Scope for AI Research Institute",
      exact: true,
    }),
  ).toHaveText("Search within this site");
  await expect(
    page.getByLabel("Use source", { exact: true }).first(),
  ).not.toBeChecked();
  await page.getByLabel("Use source", { exact: true }).first().check();
  await expect(page.locator(".source-row")).toHaveCount(2);
  const scope = page.getByRole("button", {
    name: "Scope for AI Research Institute",
    exact: true,
  });
  await scope.click();
  await expect(page.getByRole("listbox")).toBeVisible();
  await expect(
    page.getByRole("option", { name: /This page only/ }),
  ).toContainText("will not discover new articles");
  await page.screenshot({
    path: "test-results/source-mode-menu.png",
    fullPage: true,
  });
  await page.keyboard.press("Home");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(scope).toHaveText("RSS / Atom feed");
  await scope.click();
  await page.keyboard.press("Home");
  await page.keyboard.press("Enter");
  await expect(scope).toHaveText("Search within this site");
  await page
    .getByRole("button", {
      name: "Explain Search within this site",
      exact: true,
    })
    .first()
    .focus();
  await expect(page.getByRole("tooltip")).toContainText("one search credit");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("tooltip")).toHaveCount(0);
  const row = page.locator(".source-row").first();
  expect((await row.boundingBox())!.height).toBeLessThan(150);
  await page.screenshot({
    path: "test-results/recurring-sources-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await scope.click();
  await expect(page.getByRole("listbox")).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.screenshot({
    path: "test-results/source-mode-menu-mobile.png",
    fullPage: true,
  });
  await page.keyboard.press("Escape");
  await page.screenshot({
    path: "test-results/recurring-sources-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect.poll(() => saved?.sources[0].status).toBe("approved");
  expect(saved?.sources[0].scope).toBe("search");
  expect(saved?.sources[1].status).toBe("recommended");
});
