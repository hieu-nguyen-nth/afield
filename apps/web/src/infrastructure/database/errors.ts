import { AppError } from "@/core/errors";
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
