import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), rpc: vi.fn() }));
vi.mock("@/infrastructure/supabase/session-client", () => ({
  userClient: async () => ({
    auth: { getUser: mocks.getUser },
    rpc: mocks.rpc,
  }),
}));
import { requireUser } from "../session";
beforeEach(() => vi.resetAllMocks());
it("rejects missing and unverified identities before checking admission", async () => {
  for (const user of [
    null,
    { id: "user", email: "reader@example.test" },
    { id: "user", email_confirmed_at: "2026-10-31" },
  ]) {
    mocks.getUser.mockResolvedValue({ data: { user }, error: null });
    await expect(requireUser()).rejects.toMatchObject({
      code: "not_authorized",
      status: 401,
    });
  }
  expect(mocks.rpc).not.toHaveBeenCalled();
});
it("does not trust a provider identity when session verification fails", async () => {
  mocks.getUser.mockResolvedValue({
    data: {
      user: {
        id: "user",
        email: "reader@example.test",
        email_confirmed_at: "2026-10-31",
      },
    },
    error: { message: "invalid token" },
  });
  await expect(requireUser()).rejects.toMatchObject({ code: "not_authorized" });
  expect(mocks.rpc).not.toHaveBeenCalled();
});
it("rejects a verified identity when admission is revoked or deletion is pending", async () => {
  mocks.getUser.mockResolvedValue({
    data: {
      user: {
        id: "user",
        email: "reader@example.test",
        email_confirmed_at: "2026-10-31",
      },
    },
    error: null,
  });
  mocks.rpc.mockResolvedValue({ error: { message: "not_authorized" } });
  await expect(requireUser()).rejects.toMatchObject({
    code: "not_authorized",
    status: 401,
  });
  expect(mocks.rpc).toHaveBeenCalledWith("get_usage");
});
it("returns the verified owner only after database admission succeeds", async () => {
  const user = {
    id: "user",
    email: "reader@example.test",
    email_confirmed_at: "2026-10-31",
  };
  mocks.getUser.mockResolvedValue({ data: { user }, error: null });
  mocks.rpc.mockResolvedValue({ error: null });
  expect((await requireUser()).user).toBe(user);
});
