import { afterEach, expect, it, vi } from "vitest";
const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/infrastructure/database/database", () => ({
  adminClient: () => ({ rpc }),
}));
import { allowedEmail } from "@/features/auth/access";
afterEach(() => {
  vi.resetAllMocks();
  vi.unstubAllEnvs();
});
it("uses only database admission and observes changes without a restart", async () => {
  vi.stubEnv("ALLOWED_EMAILS", "other@example.test");
  rpc
    .mockResolvedValueOnce({ data: true, error: null })
    .mockResolvedValueOnce({ data: false, error: null });
  expect(await allowedEmail(" Reader@Example.test ")).toBe(true);
  expect(rpc).toHaveBeenCalledWith("is_email_allowed", {
    p_email: "reader@example.test",
  });
  expect(await allowedEmail("reader@example.test")).toBe(false);
});
it("fails closed when the database is unavailable or returns an invalid response", async () => {
  rpc.mockResolvedValueOnce({ data: null, error: { message: "offline" } });
  await expect(allowedEmail("reader@example.test")).rejects.toMatchObject({
    status: 503,
  });
  rpc.mockResolvedValueOnce({ data: null, error: null });
  await expect(allowedEmail("reader@example.test")).rejects.toMatchObject({
    status: 503,
  });
});
