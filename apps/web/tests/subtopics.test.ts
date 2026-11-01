import { beforeEach, expect, it, vi } from "vitest";
const { gemini } = vi.hoisted(() => ({ gemini: vi.fn() }));
vi.mock("../src/infrastructure/providers/providers", () => ({ gemini }));
import { suggestSubtopics } from "../src/features/research/subtopics";
beforeEach(() => vi.resetAllMocks());
it("rejects empty topic context before making a model call", async () => {
  await expect(suggestSubtopics({ prompt: "   " })).rejects.toThrow(
    "Enter a topic name or learning goal first",
  );
  expect(gemini).not.toHaveBeenCalled();
});
it("returns distinct suggestions without changing the saved topic", async () => {
  gemini.mockResolvedValue({
    subtopics: ["AI governance", "ai governance", "Adoption metrics"],
    reason: "Useful gaps",
  });
  const result = await suggestSubtopics({ prompt: "Enterprise AI adoption" });
  expect(result.subtopics).toEqual(["AI governance", "Adoption metrics"]);
});
