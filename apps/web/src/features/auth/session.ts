import { AppError } from "@/core/errors";
import { userClient } from "@/infrastructure/supabase/session-client";
import type { VerifiedAuthUser } from "./models";
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
  return { db, user: data.user as VerifiedAuthUser };
}
