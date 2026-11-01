import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  command: vi.fn(),
  speech: vi.fn(),
  transcribe: vi.fn(),
  gemini: vi.fn(),
  from: vi.fn(),
}));
vi.mock("@/config/env", () => ({ requireLive: vi.fn() }));
vi.mock("@/infrastructure/database/database", () => ({
  command: mocks.command,
  adminClient: () => ({ from: mocks.from }),
}));
vi.mock("@/infrastructure/providers/providers", () => ({
  speech: mocks.speech,
  transcribe: mocks.transcribe,
  gemini: mocks.gemini,
}));
vi.mock("@/features/research/research", () => ({ research: vi.fn() }));
import { executeRun } from "@/features/generation/pipeline";
beforeEach(() => {
  vi.clearAllMocks();
  const chain = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  mocks.from.mockReturnValue(chain);
});
it.each([
  ["words", 800, "met"],
  ["duration", 120, "unverified"],
])(
  "publishes %s text without requesting speech, transcription or audio jobs",
  async (type, value, budget) => {
    const content = {
      title: "Public topic",
      noNews: false,
      limitations: [],
      blocks: [
        {
          heading: "Answer",
          items: [{ text: "A supported fact.", citationIds: ["source"] }],
        },
      ],
    };
    const run = {
      id: "run",
      owner_id: "owner",
      topic_id: null,
      intent: "explore",
      lease_token: "token",
      snapshot: { limit: { type, value } },
      draft: {
        content,
        research: {
          documents: [
            {
              id: "source",
              text: "A supported fact.",
              url: "https://example.com",
              title: "Evidence",
              publisher: "Example",
              origin: "followed",
              publishedAt: null,
            },
          ],
          checks: [],
          partial: false,
        },
      },
    };
    mocks.command.mockImplementation(async (name: string) =>
      name === "claim_run" ? run : name === "publish_brief" ? "brief" : null,
    );
    await executeRun("run");
    expect(mocks.command).toHaveBeenCalledWith(
      "publish_brief",
      expect.objectContaining({ p_audio: null, p_budget: budget }),
    );
    expect(mocks.command).toHaveBeenCalledWith(
      "finish_run",
      expect.objectContaining({ p_error: null }),
    );
    expect(mocks.speech).not.toHaveBeenCalled();
    expect(mocks.transcribe).not.toHaveBeenCalled();
    expect(
      mocks.command.mock.calls.some(([name]) =>
        ["request_audio", "claim_audio", "attach_audio"].includes(name),
      ),
    ).toBe(false);
  },
);
