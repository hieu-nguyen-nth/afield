import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  exchange: vi.fn(),
  login: vi.fn(),
  signup: vi.fn(),
  signout: vi.fn(),
  requireUser: vi.fn(),
}));
vi.mock("@/infrastructure/supabase/session-client", () => ({
  userClient: async () => ({
    auth: {
      exchangeCodeForSession: mocks.exchange,
      signInWithPassword: mocks.login,
      signUp: mocks.signup,
      signOut: mocks.signout,
    },
  }),
}));
vi.mock("@/features/auth/session", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/infrastructure/http/request", () => ({
  assertOrigin: vi.fn(),
  readJson: (req: Request) => req.json(),
}));
vi.mock("@/config/env", () => ({
  settings: () => ({ origin: "http://localhost:3000" }),
}));
vi.mock("@/features/auth/access", () => ({
  allowedEmail: async (email: string) => email === "reader@example.test",
}));
import { GET, POST } from "@/app/api/auth/[action]/route";
beforeEach(() => {
  vi.resetAllMocks();
});
const callback = (query: string) =>
  GET(new Request("http://localhost:3000/api/auth/callback?" + query), {
    params: Promise.resolve({ action: "callback" }),
  });
const post = (action: string, email = "reader@example.test") =>
  POST(
    new Request("http://localhost:3000/api/auth/" + action, {
      method: "POST",
      body: JSON.stringify({ email, password: "synthetic-test-password" }),
    }),
    { params: Promise.resolve({ action }) },
  );
it("distinguishes OAuth cancellation, missing verifier, and access denial", async () => {
  expect(
    (await callback("error=access_denied")).headers.get("location"),
  ).toContain("auth-error=access_denied");
  expect((await callback("")).headers.get("location")).toContain(
    "auth-error=session_expired",
  );
  mocks.exchange.mockResolvedValueOnce({
    data: {},
    error: { code: "bad_code_verifier" },
  });
  expect((await callback("code=synthetic")).headers.get("location")).toContain(
    "auth-error=session_expired",
  );
  mocks.exchange.mockResolvedValueOnce({
    data: { user: { email: "other@example.test" } },
  });
  expect((await callback("code=synthetic")).headers.get("location")).toContain(
    "auth-error=access_required",
  );
  expect(mocks.signout).toHaveBeenCalledWith({ scope: "local" });
});
it("requires database access after Google authentication and accepts an approved user", async () => {
  mocks.exchange.mockResolvedValue({
    data: { user: { email: "reader@example.test" } },
  });
  mocks.requireUser.mockRejectedValueOnce(new Error("denied"));
  expect((await callback("code=synthetic")).headers.get("location")).toContain(
    "auth-error=access_check_failed",
  );
  mocks.requireUser.mockResolvedValueOnce({});
  expect((await callback("code=synthetic")).headers.get("location")).toContain(
    "signed-in=1",
  );
});
it("explains invitation requirements for both login and signup without calling the provider", async () => {
  for (const action of ["login", "signup"]) {
    const response = await post(action, "other@example.test");
    expect(response.status).toBe(403);
    expect((await response.json()).error.message).toContain(
      "ask the app owner",
    );
  }
  expect(mocks.login).not.toHaveBeenCalled();
  expect(mocks.signup).not.toHaveBeenCalled();
});
it("gives useful credential and rate-limit guidance without claiming an account is missing", async () => {
  mocks.login.mockResolvedValue({ error: { code: "invalid_credentials" } });
  const bad = await (await post("login")).json();
  expect(bad.error.message).toContain("Create personal account");
  expect(bad.error.message).toContain("Continue with Google");
  mocks.signup.mockResolvedValue({
    error: { code: "over_email_send_rate_limit", status: 429 },
  });
  const limited = await post("signup");
  expect(limited.status).toBe(429);
  expect((await limited.json()).error.message).toContain("wait a few minutes");
});
