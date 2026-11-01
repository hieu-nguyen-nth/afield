import { test, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";

test("document both main journeys with synthetic data and explicit source/audio consent", async ({
  page,
}) => {
  test.setTimeout(90000);
  page.setDefaultTimeout(10000);
  const out = "../../docs/walkthrough/images";
  mkdirSync(out, { recursive: true });
  const shot = async (name: string) => {
    await page.screenshot({
      path: `${out}/${name}.png`,
      fullPage: true,
      animations: "disabled",
    });
  };
  let authenticated = false;
  let published = false;
  let finished = false;
  let audioRequests = 0;
  let saved: Record<string, unknown> | null = null;
  let activated = false;
  const id = "88888888-8888-4888-8888-888888888888";
  const topicId = "11111111-1111-4111-8111-111111111111";
  const snapshot = {
    prompt: "Explain enterprise AI evaluation in 1000 words",
    preferences:
      "I work in product management. Focus on practical evaluation and limitations.",
    depth: "working",
    limit: { type: "words", value: 400 },
    sourceMode: "sources_only",
    sources: [{ url: "https://research.example/report", scope: "page" }],
  };
  const brief = {
    id,
    run_id: id,
    topic_id: null,
    intent: "explore",
    title: "A practical starting point for AI evaluation",
    created_at: "2026-10-31T18:00:00Z",
    word_count: 86,
    summary:
      "Define the decision, test representative tasks, and examine failures before expanding use.",
    audio_status: "not_requested",
    budget_status: "met",
    partial: false,
    selected_audio_id: null,
    snapshot,
    canonical_text:
      "Define the decision before choosing an evaluation. Test representative tasks and inspect failure cases.",
    text_hash: "synthetic-example",
    citations: [
      {
        id: "e1",
        url: "https://research.example/report",
        title: "Evaluation methods — synthetic example",
        publisher: "Example Research Institute",
      },
    ],
    sourceChecks: [
      {
        scope: "https://research.example/report",
        outcome: "success",
        document_count: 1,
        reason: null,
      },
    ],
    content: {
      title: "A practical starting point for AI evaluation",
      noNews: false,
      limitations: [
        "Illustrative walkthrough content; this is a synthetic fixture, not a live research result.",
      ],
      blocks: [
        {
          heading: "Big picture",
          items: [
            {
              text: "Start with the decision the product must support. A useful evaluation connects representative tasks, explicit success criteria and the cost of failure.",
              citationIds: ["e1"],
            },
          ],
        },
        {
          heading: "Practical next steps",
          items: [
            {
              text: "Build a small test set, inspect the errors, and compare against the current workflow before expanding use. Keep human review for consequential outputs.",
              citationIds: ["e1"],
            },
          ],
        },
      ],
    },
  };
  await page.route("**/api/v1/**", async (route) => {
    const p = new URL(route.request().url()).pathname;
    if (!authenticated)
      return route.fulfill({
        status: 401,
        json: { error: { message: "Sign in with an invited account." } },
      });
    if (p.endsWith("/me"))
      return route.fulfill({
        json: {
          user: { id: topicId, email: "reader@example.test" },
          usage: {
            runs: 1,
            limit: 30,
            shared: true,
            resetsAt: "2026-11-01T00:00:00Z",
            dailyResetsAt: "2026-11-01T00:00:00Z",
          },
          capabilities: { live: true, search: true, cloud: false, audio: true },
        },
      });
    if (p.endsWith("/explorations/prepare"))
      return route.fulfill({ json: { conflict: true } });
    if (p.endsWith("/explorations")) {
      expect(route.request().postDataJSON().resolvedConflict).toBe(true);
      return route.fulfill({ json: { runId: id } });
    }
    if (p.endsWith(`/runs/${id}`)) {
      if (finished) published = true;
      return route.fulfill({
        json: {
          id,
          intent: "explore",
          snapshot,
          created_at: brief.created_at,
          updated_at: new Date().toISOString(),
          attempts: 1,
          status: finished ? "completed" : "running",
          stage: finished ? "completed" : "research",
          brief_id: finished ? id : undefined,
          events: [
            {
              id: "event",
              stage: "research",
              status: "running",
              created_at: new Date().toISOString(),
              error_code: null,
            },
          ],
          error: null,
        },
      });
    }
    if (p.endsWith("/runs")) return route.fulfill({ json: [] });
    if (p.endsWith(`/briefs/${id}/audio/generate`)) {
      audioRequests++;
      brief.audio_status = "pending";
      return route.fulfill({ json: { queued: true, cached: false } });
    }
    if (p.endsWith(`/briefs/${id}`)) return route.fulfill({ json: brief });
    if (p.endsWith("/briefs"))
      return route.fulfill({
        json: { items: published ? [brief] : [], cursor: null },
      });
    if (p.endsWith("/assist/sources"))
      return route.fulfill({
        json: {
          sources: [
            {
              name: "Example Research Institute",
              url: "https://research.example/",
              scope: "search",
              status: "recommended",
              rationale:
                "Publishes substantive research and explanations about evaluation methods. Synthetic example.",
            },
          ],
        },
      });
    if (p.endsWith("/assist/subtopics"))
      return route.fulfill({
        json: {
          subtopics: [
            {
              name: "Model evaluation",
              rationale: "Understand evaluation quality.",
            },
          ],
        },
      });
    if (p.endsWith(`/topics/${topicId}/activate`)) {
      activated = true;
      return route.fulfill({ json: { id: topicId } });
    }
    if (p.endsWith("/topics") && route.request().method() === "POST") {
      saved = route.request().postDataJSON().config;
      return route.fulfill({ json: { id: topicId } });
    }
    if (p.endsWith("/topics"))
      return route.fulfill({
        json: saved
          ? [
              {
                id: topicId,
                name: saved.name,
                config: saved,
                status: activated ? "active" : "draft",
              },
            ]
          : [],
      });
    return route.fulfill({
      status: 404,
      json: { error: { message: "Unconfigured walkthrough fixture" } },
    });
  });
  await page.goto("/");
  await expect(page.getByLabel("Email address")).toBeVisible();
  await shot("01-sign-in");
  authenticated = true;
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Make room for curiosity." }),
  ).toBeVisible();
  await shot("02-overview");
  await page.getByRole("button", { name: "Start exploring" }).click();
  await page.getByLabel("Your question").fill(snapshot.prompt);
  await page.getByLabel("A little context").fill(snapshot.preferences);
  await page.getByLabel("Reading length", { exact: true }).selectOption("400");
  await page
    .getByLabel("Source 1 URL", { exact: true })
    .fill("https://research.example/report");
  await shot("03-explore");
  await page
    .getByRole("button", { name: "Make my brief", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Use selected limit" }),
  ).toBeVisible();
  await shot("04-explore-review");
  await page.getByRole("button", { name: "Use selected limit" }).click();
  await expect(
    page.getByText("research", { exact: true }).first(),
  ).toBeVisible();
  await shot("05-progress");
  finished = true;
  await expect(
    page.getByRole("heading", { name: brief.title, exact: true }),
  ).toBeVisible({ timeout: 15000 });
  expect(audioRequests).toBe(0);
  await page
    .getByText("Original request & source coverage", { exact: true })
    .click();
  await shot("06-brief");
  await page
    .getByRole("button", { name: "Generate audio", exact: true })
    .click();
  await expect.poll(() => audioRequests).toBe(1);
  await expect(
    page.getByText("Narration is being prepared.", { exact: false }).first(),
  ).toBeVisible();
  await shot("07-audio-requested");
  await page.getByRole("button", { name: "Stay updated", exact: true }).click();
  await page.getByRole("button", { name: "New topic", exact: true }).click();
  await page
    .getByLabel("Topic name", { exact: true })
    .fill("Enterprise AI adoption");
  await page
    .getByLabel("Learning goal", { exact: true })
    .fill("Understand practical adoption and evaluation changes.");
  await page.getByLabel("New subtopic title").fill("Model evaluation");
  await page.getByRole("button", { name: "Add subtopic", exact: true }).click();
  await shot("08-topic-settings");
  await page
    .getByRole("button", { name: "Manage sources", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Suggest recurring sources", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "Example Research Institute", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Use source", { exact: true }),
  ).not.toBeChecked();
  await page.getByLabel("Use source", { exact: true }).check();
  await shot("09-topic-sources");
  await page.getByRole("button", { name: "Templates", exact: true }).click();
  await page
    .getByRole("button", { name: "Copy template", exact: true })
    .click();
  await page.getByLabel("Template name").fill("My weekly reading");
  await page
    .getByRole("button", { name: "Move Main developments up", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Use for future updates", exact: true })
    .click();
  await shot("10-topic-templates");
  await page
    .getByRole("button", { name: "Review & activate", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Confirm and activate" }),
  ).toBeVisible();
  await shot("11-topic-review");
  await page.getByRole("button", { name: "Confirm and activate" }).click();
  await expect.poll(() => activated).toBe(true);
  await expect(
    page.getByRole("heading", { name: "Enterprise AI adoption", exact: true }),
  ).toBeVisible();
  await shot("12-topics");
  await page.getByRole("button", { name: "Open topic", exact: true }).click();
  await expect(page.getByLabel("Update source mode")).toBeVisible();
  await shot("17-topic-latest");
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "History", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: new RegExp(brief.title) }),
  ).toBeVisible();
  await shot("13-history");
  await page.getByRole("button", { name: "Personal account" }).click();
  await expect(
    page.getByRole("heading", { name: "Account & usage", exact: true }),
  ).toBeVisible();
  await shot("14-account");
  await page
    .getByRole("button", { name: "Settings & privacy", exact: true })
    .click();
  await shot("15-privacy");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Explore", exact: true }).click();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await shot("16-mobile");
});
