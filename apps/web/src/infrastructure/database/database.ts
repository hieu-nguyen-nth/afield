import { createClient } from "@supabase/supabase-js";
import { settings } from "../../config/env";
import { AppError } from "../../core/errors";
export function adminClient() {
  const cfg = settings(),
    key = process.env.SUPABASE_SECRET_KEY;
  if (!key)
    throw new AppError(
      "configuration_invalid",
      "The private worker credential is not configured.",
      503,
    );
  return createClient(cfg.url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
export async function command(name: string, args: Record<string, unknown>) {
  const { data, error } = await adminClient().rpc(name, args);
  if (error)
    throw new AppError(
      error.message.includes("quota_exceeded")
        ? "quota_exceeded"
        : error.message.includes("stale_lease")
          ? "stale_lease"
          : "generation_failed",
      error.message.includes("quota_exceeded")
        ? "The free allowance is exhausted."
        : "A background stage could not complete.",
      503,
      true,
    );
  return data;
}
