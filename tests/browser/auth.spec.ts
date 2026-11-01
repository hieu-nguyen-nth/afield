import { test, expect } from "@playwright/test";
test("Google callback failures are visible and switching to signup clears stale errors", async ({
  page,
}) => {
  await page.goto("/?auth-error=access_required");
  await expect(page.getByRole("status")).toContainText("does not have access");
  await page
    .getByRole("button", { name: "Create personal account", exact: true })
    .click();
  await expect(page.getByRole("status")).toHaveCount(0);
  await expect(
    page.getByText(
      "Create an account with an email approved by the app owner.",
    ),
  ).toBeVisible();
  await page.goto("/?auth-error=1");
  await expect(page.getByRole("status")).toContainText(
    "Sign-in could not complete",
  );
});
test("unapproved login and signup explain how to obtain access", async ({
  page,
}) => {
  // UI-message fixture; real route/admission behavior is covered by auth/access unit tests.
  await page.route("**/api/auth/*", (route) =>
    route.fulfill({
      status: 403,
      json: {
        error: {
          code: "access_required",
          message:
            "This email does not have access to this private Afield app yet. Use an approved email, or ask the app owner to add this address before signing in or creating an account.",
        },
      },
    }),
  );
  await page.goto("/");
  await page.getByLabel("Email address").fill("unapproved@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("synthetic-test-password");
  await page.getByRole("button", { name: "Enter your reading room" }).click();
  await expect(page.getByRole("status")).toContainText("ask the app owner");
  await page
    .getByRole("button", { name: "Create personal account", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "before signing in or creating an account",
  );
  await page.screenshot({
    path: "test-results/auth-feedback.png",
    fullPage: true,
  });
});
