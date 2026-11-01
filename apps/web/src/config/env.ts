import { AppError } from "../core/errors";
export function settings() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key)
    throw new AppError(
      "configuration_invalid",
      "Connect the private Supabase project first.",
      503,
    );
  return {
    url,
    key,
    origin: new URL(process.env.APP_URL || "http://localhost:3000").origin,
  };
}
export function requireLive() {
  if (
    process.env.DEPLOYMENT_PROFILE !== "personal_free" ||
    process.env.FREE_TIERS_VERIFIED !== "true" ||
    process.env.LIVE_GENERATION_ENABLED !== "true"
  )
    throw new AppError(
      "configuration_invalid",
      "Generation is paused until free-tier setup is verified and enabled.",
      503,
    );
  for (const k of ["GEMINI_API_KEY", "SUPABASE_SECRET_KEY"])
    if (!process.env[k])
      throw new AppError(
        "configuration_invalid",
        "Finish the private provider configuration before generating.",
        503,
      );
  if (
    process.env.EXECUTION_MODE === "cloud" &&
    (!process.env.TRIGGER_SECRET_KEY || !process.env.TRIGGER_PROJECT_REF)
  )
    throw new AppError(
      "configuration_invalid",
      "Connect the optional cloud worker first.",
      503,
    );
}
