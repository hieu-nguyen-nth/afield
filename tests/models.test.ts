import { afterEach, expect, it, vi } from "vitest";
import { textModel } from "../src/infrastructure/providers/models";
afterEach(() => vi.unstubAllEnvs());
it("uses the explicitly configured free-tier model and rejects unsupported models", () => {
  vi.stubEnv("GEMINI_TEXT_MODEL", "gemini-3.5-flash-lite");
  expect(textModel()).toBe("gemini-3.5-flash-lite");
  vi.stubEnv("GEMINI_TEXT_MODEL", "unverified-model");
  expect(textModel).toThrow("supported free-tier");
});
