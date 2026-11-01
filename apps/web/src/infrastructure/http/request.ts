import { AppError } from "@/core/errors";
import { settings } from "@/config/env";
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
