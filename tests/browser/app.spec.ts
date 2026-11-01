import { test, expect } from "@playwright/test";
const me = {
  user: {
    id: "11111111-1111-4111-8111-111111111111",
    email: "reader@example.test",
  },
  usage: { runs: 0, limit: 30 },
  capabilities: { live: true, search: false, cloud: false, audio: true },
};
async function workspace(page: import("@playwright/test").Page) {
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/me")) return route.fulfill({ json: me });
    if (path.endsWith("/briefs"))
      return route.fulfill({ json: { items: [], cursor: null } });
    if (path.endsWith("/topics") || path.endsWith("/runs"))
      return route.fulfill({ json: [] });
    return route.fulfill({
      status: 404,
      json: { error: { message: "Unconfigured test fixture" } },
    });
  });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Make room for curiosity." }),
  ).toBeVisible();
}
test("guest API and cross-origin mutations are denied without leaking private data", async ({
  request,
}) => {
  for (const path of ["/api/v1/topics", "/api/v1/briefs", "/api/v1/export"]) {
    const response = await request.get(path);
    expect(response.status()).toBe(401);
    expect(await response.text()).not.toContain("owner_id");
  }
  const denied = await request.post("/api/v1/explorations", {
    headers: { Origin: "https://untrusted.example" },
    data: { prompt: "anything" },
  });
  expect(denied.status()).toBe(403);
});
test("production HTML receives fresh nonce CSP and blocks framing", async ({
  request,
}) => {
  const a = await request.get("/"),
    b = await request.get("/");
  expect(a.headers()["content-security-policy"]).toContain("'strict-dynamic'");
  expect(a.headers()["content-security-policy"]).not.toContain("unsafe-eval");
  expect(a.headers()["content-security-policy"]).not.toBe(
    b.headers()["content-security-policy"],
  );
  expect(a.headers()["x-frame-options"]).toBe("DENY");
});
test("sign-in and setup guide render without account keys", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Good to have you here." }),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/sign-in.png", fullPage: true });
  await page.goto("/setup");
  await expect(
    page.getByRole("heading", { name: "3. Start with direct sources" }),
  ).toBeVisible();
});
test("private workspace renders on desktop and mobile using synthetic fixtures", async ({
  page,
}) => {
  await workspace(page);
  await page.screenshot({ path: "test-results/workspace.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("button", { name: "Explore", exact: false }).first(),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/mobile.png", fullPage: true });
});
test("personal account opens usage while settings and sign out are separate actions", async ({
  page,
}) => {
  await workspace(page);
  let logouts = 0;
  await page.route("**/api/auth/logout", (r) => {
    logouts++;
    return r.fulfill({ json: { ok: true } });
  });
  await page.getByRole("button", { name: "Personal account" }).click();
  await expect(
    page.getByRole("heading", { name: "Account & usage", exact: true }),
  ).toBeVisible();
  expect(logouts).toBe(0);
  await expect(page.getByText("Monthly reset", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Settings & privacy", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Settings & privacy", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Connection & key guide" }),
  ).toHaveCount(0);
  await page.screenshot({
    path: "test-results/account-settings.png",
    fullPage: true,
  });
  await page.route("**/api/v1/me", (r) =>
    r.fulfill({ status: 401, json: { error: { message: "Signed out" } } }),
  );
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Good to have you here." }),
  ).toBeVisible();
  expect(logouts).toBe(1);
});
test("exploration retries preserve their idempotency identity", async ({
  page,
}) => {
  await workspace(page);
  await page.getByRole("button", { name: "Start exploring" }).click();
  await page.getByLabel("Your question").fill("Explain real-time payments");
  await page.getByLabel("Source 1 URL").fill("https://example.com/source");
  await page.route("**/api/v1/explorations/prepare", (r) =>
    r.fulfill({ json: { conflict: false } }),
  );
  const keys: string[] = [];
  await page.route("**/api/v1/explorations", async (r) => {
    keys.push(r.request().headers()["idempotency-key"]);
    return r.fulfill({
      status: 503,
      json: { error: { message: "Synthetic temporary provider failure" } },
    });
  });
  await page.getByRole("button", { name: "Make my brief" }).click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Synthetic temporary provider failure" }),
  ).toContainText("Synthetic temporary provider failure");
  await page.getByRole("button", { name: "Make my brief" }).click();
  await expect.poll(() => keys.length).toBe(2);
  expect(keys[0]).toBe(keys[1]);
});
test("a failed generation stops status checks instead of repeatedly reloading the account", async ({
  page,
}) => {
  await workspace(page);
  let polls = 0;
  await page.route("**/api/v1/explorations/prepare", (r) =>
    r.fulfill({ json: { conflict: false } }),
  );
  await page.route("**/api/v1/explorations", (r) =>
    r.fulfill({ json: { runId: "synthetic-run" } }),
  );
  await page.route("**/api/v1/runs/synthetic-run", (r) => {
    polls++;
    return r.fulfill({
      json: {
        id: "synthetic-run",
        status: "failed",
        stage: "failed",
        intent: "explore",
        snapshot: { prompt: "Explain payments" },
        error: {
          code: "provider_unavailable",
          message: "Google’s AI service is temporarily busy or unavailable.",
          retryable: true,
        },
      },
    });
  });
  await page.getByRole("button", { name: "Start exploring" }).click();
  await page.getByLabel("Your question").fill("Explain payments");
  await page.getByLabel("Source 1 URL").fill("https://example.com/source");
  await page.getByRole("button", { name: "Make my brief" }).click();
  await expect(
    page.getByText("Google’s AI service is temporarily busy or unavailable.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Retry this request" }),
  ).toBeVisible();
  // Observe for longer than the normal three-second polling interval.
  await page.waitForTimeout(3500);
  expect(polls).toBe(1);
});
test("topic templates can be copied, reordered, and reviewed without automatic source approval", async ({
  page,
}) => {
  await workspace(page);
  await page.getByRole("button", { name: "Create your first topic" }).click();
  await page.getByRole("button", { name: "New topic" }).click();
  await page.getByLabel("Topic name").fill("AI in practice");
  await page.getByLabel("Learning goal").fill("Understand meaningful changes");
  await page.getByRole("button", { name: "Templates", exact: true }).click();
  await page
    .getByRole("button", { name: "Copy template", exact: true })
    .click();
  await page.getByLabel("Template name").fill("My deep-dive copy");
  await page
    .getByRole("button", { name: "Move Main developments up", exact: true })
    .click();
  await page.getByRole("button", { name: "Review & activate" }).click();
  await expect(
    page.getByText("Approve at least one accessible source first"),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/topic-review.png",
    fullPage: true,
  });
});

test("Afield requests narration only after the button is pressed and reuses it when reopened", async ({
  page,
}) => {
  await workspace(page);
  const id = "88888888-8888-4888-8888-888888888888";
  const brief = {
    id,
    owner_id: me.user.id,
    run_id: id,
    topic_id: null,
    intent: "explore",
    title: "Consent test brief",
    created_at: "2026-10-28T12:00:00Z",
    word_count: 20,
    audio_status: "not_requested",
    budget_status: "met",
    selected_audio_id: null as string | null,
    audio_error: null,
    partial: false,
    canonical_text: "A supported fact.",
    text_hash: "synthetic-hash",
    snapshot: { limit: { type: "words", value: 400 } },
    citations: [],
    content: {
      title: "Consent test brief",
      noNews: false,
      limitations: [],
      blocks: [
        {
          heading: "Answer",
          items: [{ text: "A supported fact.", citationIds: [] }],
        },
      ],
    },
  };
  let requests = 0;
  await page.route("**/api/v1/briefs", (r) =>
    r.fulfill({ json: { items: [brief], cursor: null } }),
  );
  await page.route("**/api/v1/briefs/" + id, (r) => r.fulfill({ json: brief }));
  await page.route("**/api/v1/briefs/" + id + "/audio", (r) =>
    r.fulfill({
      json: { url: "http://localhost:3000/synthetic.mp3", duration: 12 },
    }),
  );
  await page.route("**/api/v1/briefs/" + id + "/audio/generate", (r) => {
    requests++;
    brief.audio_status = "ready";
    brief.selected_audio_id = "cached-asset";
    return r.fulfill({ json: { cached: true, queued: false } });
  });
  await page.reload();
  await expect(page).toHaveTitle(/Afield/);
  await page.getByRole("button", { name: /Consent test brief/ }).click();
  await expect(
    page.getByRole("button", { name: "Generate audio", exact: true }),
  ).toBeVisible();
  expect(requests).toBe(0);
  await page
    .getByRole("button", { name: "Generate audio", exact: true })
    .click();
  await expect(
    page.getByText("Listen to this brief", { exact: true }),
  ).toBeVisible();
  expect(requests).toBe(1);
  await page.reload();
  await page.getByRole("button", { name: /Consent test brief/ }).click();
  await expect(
    page.getByText("Listen to this brief", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Generate audio", exact: true }),
  ).toHaveCount(0);
  expect(requests).toBe(1);
  await page.screenshot({
    path: "test-results/afield-audio-consent.png",
    fullPage: true,
  });
});
