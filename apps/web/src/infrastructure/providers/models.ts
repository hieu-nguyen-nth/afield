import { AppError } from "../../core/errors";

export function textModel() {
  const model = process.env.GEMINI_TEXT_MODEL || "gemini-3.8-flash";
  // Explicitly selected models with verified free-tier eligibility; no automatic fallback.
  if (!["gemini-3.8-flash", "gemini-3.5-flash-lite"].includes(model))
    throw new AppError(
      "configuration_invalid",
      "Select a supported free-tier text model.",
      503,
    );
  return model;
}
