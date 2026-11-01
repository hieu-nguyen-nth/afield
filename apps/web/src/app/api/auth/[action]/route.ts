import { NextResponse } from "next/server";
import { z } from "zod";
import {
  userClient,
  assertOrigin,
  readJson,
  requireUser,
} from "@/infrastructure/auth/server";
import { settings } from "@/config/env";
import { allowedEmail } from "@/infrastructure/auth/access";
import { AppError, errorBody } from "@/core/errors";
import {
  accessMessage,
  authFailure,
  callbackMessage,
} from "@/infrastructure/auth/auth-feedback";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ action: string }> };
export async function POST(req: Request, { params }: Context) {
  try {
    assertOrigin(req);
    const { action } = await params;
    const db = await userClient(),
      origin = settings().origin;
    const body = await readJson(req);
    if (action === "logout") {
      await db.auth.signOut({ scope: "local" });
      return NextResponse.json({ ok: true });
    }
    if (action === "google") {
      const { data, error } = await db.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/api/auth/callback`,
          skipBrowserRedirect: true,
        },
      });
      if (error || !data.url)
        throw new AppError(
          "configuration_invalid",
          "Enable Google OAuth in the Supabase project first.",
          503,
        );
      return NextResponse.json({ url: data.url });
    }
    if (action === "password") {
      await requireUser();
      const { password } = z
        .object({ password: z.string().min(12).max(128) })
        .strict()
        .parse(body);
      const { error } = await db.auth.updateUser({ password });
      if (error)
        throw new AppError(
          "validation_failed",
          "The password could not be updated.",
        );
      return NextResponse.json({ ok: true });
    }
    const { email, password } = z
      .object({
        email: z.string().trim().toLowerCase().pipe(z.email()),
        password: z.string().max(128).optional(),
      })
      .strict()
      .parse(body);
    if (!(await allowedEmail(email)))
      throw new AppError("access_required", accessMessage, 403);
    if (action === "reset") {
      const { error } = await db.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/api/auth/callback`,
      });
      if (error)
        throw new AppError(
          "recovery_failed",
          authFailure(error, action),
          error.status === 429 ? 429 : 400,
        );
      return NextResponse.json({
        message: "If the account is eligible, a recovery email will arrive.",
      });
    }
    if (!password || password.length < 12)
      throw new AppError(
        "validation_failed",
        "Use a password with at least 12 characters.",
      );
    const response =
      action === "signup"
        ? await db.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: `${origin}/api/auth/callback` },
          })
        : action === "login"
          ? await db.auth.signInWithPassword({ email, password })
          : null;
    if (!response)
      throw new AppError("validation_failed", "Unknown authentication action.");
    if (response.error)
      throw new AppError(
        "authentication_failed",
        authFailure(response.error, action),
        response.error.status === 429 ? 429 : 400,
      );
    if (response.data.session) {
      try {
        await requireUser();
      } catch {
        await db.auth.signOut({ scope: "local" });
        throw new AppError(
          "access_check_failed",
          callbackMessage("access_check_failed"),
          403,
        );
      }
    }
    return NextResponse.json({ ok: true, verify: !response.data.session });
  } catch (e) {
    return NextResponse.json(errorBody(e), {
      status: e instanceof AppError ? e.status : 400,
    });
  }
}
export async function GET(req: Request, { params }: Context) {
  const origin = settings().origin;
  const failure = (reason: string) => {
    const url = new URL("/", origin);
    url.searchParams.set("auth-error", reason);
    return NextResponse.redirect(url);
  };
  try {
    if ((await params).action !== "callback")
      throw new AppError("validation_failed", "Unknown callback.");
    const query = new URL(req.url).searchParams;
    if (query.get("error"))
      return failure(
        query.get("error") === "access_denied"
          ? "access_denied"
          : "provider_error",
      );
    const code = query.get("code");
    if (!code) return failure("session_expired");
    const db = await userClient();
    const { data, error } = await db.auth.exchangeCodeForSession(code);
    if (error || !data.user?.email) return failure("session_expired");
    if (!(await allowedEmail(data.user.email))) {
      await db.auth.signOut({ scope: "local" });
      return failure("access_required");
    }
    try {
      await requireUser();
    } catch {
      await db.auth.signOut({ scope: "local" });
      return failure("access_check_failed");
    }
    return NextResponse.redirect(new URL("/?signed-in=1", origin));
  } catch {
    return failure("provider_error");
  }
}
