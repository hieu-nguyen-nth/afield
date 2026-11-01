import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { AppError } from "../../core/errors";
import { settings } from "../../config/env";
export async function userClient() {
  const cfg = settings(),
    jar = await cookies();
  return createServerClient(cfg.url, cfg.key, {
    cookieOptions: {
      httpOnly: true,
      sameSite: "lax",
      secure: cfg.origin.startsWith("https:"),
    },
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (values) => {
        for (const c of values) jar.set(c.name, c.value, c.options);
      },
    },
  });
}
export { adminClient } from "../database/database";
export async function requireUser() {
  const db = await userClient();
  const { data, error } = await db.auth.getUser();
  if (error || !data.user || !data.user.email_confirmed_at || !data.user.email)
    throw new AppError(
      "not_authorized",
      "Sign in with an admitted, verified account.",
      401,
    );
  const admission = await db.rpc("get_usage");
  if (admission.error)
    throw new AppError(
      "not_authorized",
      "This account is not admitted or is being deleted.",
      401,
    );
  return { db, user: data.user };
}
export function assertOrigin(req: Request) {
  if (
    req.headers.get("origin") !== settings().origin ||
    req.headers.get("sec-fetch-site") === "cross-site"
  )
    throw new AppError(
      "not_authorized",
      "This request must come from your application.",
      403,
    );
}
export async function readJson(req: Request) {
  if (!req.headers.get("content-type")?.startsWith("application/json"))
    throw new AppError("validation_failed", "Expected JSON input.", 415);
  const reader = req.body?.getReader();
  let raw = "",
    bytes = 0;
  const decoder = new TextDecoder();
  if (!reader) return {};
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 100000)
        throw new AppError(
          "validation_failed",
          "The request is too large.",
          413,
        );
      raw += decoder.decode(value, { stream: true });
    }
    raw += decoder.decode();
    return JSON.parse(raw);
  } catch (e) {
    if (e instanceof AppError) throw e;
    throw new AppError("validation_failed", "Invalid JSON input.");
  } finally {
    reader.releaseLock();
  }
}
export function dbError(e: { message: string } | null) {
  if (!e) return;
  const code = [
    "quota_exceeded",
    "not_authorized",
    "configuration_invalid",
    "validation_failed",
    "idempotency_conflict",
    "stale_lease",
    "budget_not_met",
    "evidence_validation_failed",
  ].find((c) => e.message.includes(c));
  if (code)
    throw new AppError(
      code,
      (
        {
          quota_exceeded:
            "Your free allowance is currently exhausted. Saved results remain available.",
          not_authorized: "This item is unavailable.",
          configuration_invalid:
            "Review the topic’s sources, template, and confirmation.",
          budget_not_met:
            "Verified narration for this text exceeds the listening limit. Request a shorter brief.",
          idempotency_conflict:
            "This request key already belongs to a different request.",
        } as Record<string, string>
      )[code] || "The request could not pass validation.",
      code === "not_authorized" ? 404 : code === "quota_exceeded" ? 429 : 409,
    );
  throw new AppError(
    "configuration_invalid",
    "The database could not complete this operation.",
    503,
  );
}
