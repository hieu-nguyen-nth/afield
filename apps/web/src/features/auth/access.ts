import { adminClient } from "@/infrastructure/database/database";
import { AppError } from "@/core/errors";

/** The database is the sole source of invitation access; never cache this check. */
export async function allowedEmail(email: string): Promise<boolean> {
  const { data, error } = await adminClient().rpc("is_email_allowed", {
    p_email: email.trim().toLowerCase(),
  });
  if (error || typeof data !== "boolean")
    throw new AppError(
      "access_check_failed",
      "Afield could not check your access right now. Please try again in a moment.",
      503,
    );
  return data;
}
