import { z } from "zod";
import { requireLive } from "@/config/env";
import { AppError } from "@/core/errors";
import { safeFetch } from "@/infrastructure/network/safe-fetch";
import { recommendSources } from "@/features/research/source-recommendations";
import { suggestSubtopics, subtopicInput } from "@/features/topics/subtopics";

import type { ApiContext } from "@/infrastructure/http/context";
export async function mutateResearch(context: ApiContext) {
  const { parts, body } = context;
  if (parts[0] === "sources" && parts[1] === "check") {
    const { url: source } = z
      .object({ url: z.url().max(2000) })
      .strict()
      .parse(body);
    const result = await safeFetch(source);
    return {
      accessible: true,
      url: result.url,
      scope:
        "Verified public retrieval; expertise is not established by accessibility.",
    };
  }
  if (parts[0] === "assist") {
    requireLive();
    const input = subtopicInput.parse(body);
    if (parts[1] === "sources") {
      return recommendSources(input);
    }
    if (parts[1] === "subtopics") return suggestSubtopics(input);
    throw new AppError("validation_failed", "Unknown suggestion request.", 404);
  }
  throw new AppError("validation_failed", "Unknown endpoint.", 404);
}
