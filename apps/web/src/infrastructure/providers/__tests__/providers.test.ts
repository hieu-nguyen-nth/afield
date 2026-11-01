import { afterEach, expect, it, vi } from "vitest";
import { z } from "zod";
vi.mock("@/config/env", () => ({ requireLive: vi.fn() }));
vi.mock("@/infrastructure/database/database", () => ({
  command: vi.fn().mockResolvedValue(null),
}));
import {
  gemini,
  speech,
  transcribe,
  search,
} from "@/infrastructure/providers/providers";
it("sends an explicit restricted domain search with basic credit usage", async () => {
  vi.stubEnv("TAVILY_API_KEY", "synthetic-test-key");
  let body: Record<string, unknown> = {};
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url, init) => {
      body = JSON.parse(init.body);
      return Response.json({ results: [] });
    }),
  );
  await search("Enterprise AI site:example.com", ["example.com"]);
  expect(body).toMatchObject({
    include_domains: ["example.com"],
    include_domains_mode: "restrict",
    search_depth: "basic",
    include_answer: false,
  });
});
it("distinguishes temporary Google outages from model quota and credentials", async () => {
  vi.stubEnv("GEMINI_API_KEY", "synthetic-test-key");
  for (const [status, code, retryable] of [
    [503, "provider_unavailable", true],
    [429, "quota_exceeded", true],
    [403, "generation_failed", false],
  ] as const) {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status })),
    );
    await expect(
      gemini("Test", z.object({ ok: z.boolean() }), {}),
    ).rejects.toMatchObject({ code, retryable });
  }
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
it("opts out of stored interactions across text, speech and inline transcription", async () => {
  vi.stubEnv("GEMINI_API_KEY", "synthetic-test-key");
  const bodies: Record<string, unknown>[] = [];
  const responses = [
    {
      steps: [
        {
          type: "model_output",
          content: [{ type: "text", text: '{"answer":"supported"}' }],
        },
      ],
    },
    {
      steps: [
        {
          type: "model_output",
          content: [
            { type: "audio", data: Buffer.from("audio").toString("base64") },
          ],
        },
      ],
    },
    {
      steps: [
        {
          type: "model_output",
          content: [{ type: "text", text: "spoken text" }],
        },
      ],
    },
  ];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url, init) => {
      bodies.push(JSON.parse(init.body));
      return Response.json(responses.shift());
    }),
  );
  expect(
    await gemini("Answer", z.object({ answer: z.string() }), {
      public: "evidence",
    }),
  ).toEqual({ answer: "supported" });
  expect((await speech("spoken text")).toString()).toBe("audio");
  expect(await transcribe(Buffer.from("synthetic-mp3"))).toBe("spoken text");
  expect(bodies).toHaveLength(3);
  for (const body of bodies) expect(body.store).toBe(false);
  expect(JSON.stringify(bodies[2])).toContain('"mime_type":"audio/mp3"');
  expect(JSON.stringify(bodies)).not.toContain("synthetic-test-key");
});
