import { z } from "zod";
import { gemini } from "../../infrastructure/providers/providers";
import { AppError } from "../../core/errors";

export const subtopicInput = z
  .object({
    prompt: z
      .string()
      .trim()
      .min(1, "Enter a topic name or learning goal first.")
      .max(4000),
  })
  .strict();
const suggestions = z.object({
  subtopics: z.array(z.string().trim().min(1).max(100)).min(1).max(6),
  reason: z.string().trim().min(1).max(1000),
});
export async function suggestSubtopics(input: unknown) {
  const request = subtopicInput.parse(input);
  const result = await gemini(
    "Suggest three to six distinct, concise, editable subtopics for the stated topic, learning goal and context. Each label must be at most 100 characters. Avoid duplicating the existing interests. Explain briefly how the suggestions fill useful gaps. These are suggested learning directions, not researched facts. Never invent source credentials.",
    suggestions,
    request,
  );
  const seen = new Set<string>();
  const unique = result.subtopics.filter((topic) => {
    const key = topic.toLocaleLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (!unique.length)
    throw new AppError(
      "generation_failed",
      "No useful suggestions were returned. Please try again.",
      503,
      true,
    );
  return { ...result, subtopics: unique };
}
