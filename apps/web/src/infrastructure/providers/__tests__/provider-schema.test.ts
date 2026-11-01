import { expect, it } from "vitest";
import { z } from "zod";
import { contentSchema } from "@/features/briefs/models";
import { providerSchema } from "@/infrastructure/providers/provider-schema";
it("keeps the brief shape while leaving expensive length constraints to local validation", () => {
  const schema = JSON.stringify(providerSchema(z.toJSONSchema(contentSchema)));
  expect(schema).toContain('"citationIds"');
  expect(schema).toContain('"required"');
  expect(schema).not.toContain('"maxLength"');
  expect(schema).not.toContain('"maxItems"');
  expect(
    contentSchema.safeParse({
      title: "x".repeat(241),
      noNews: false,
      limitations: [],
      blocks: [],
    }).success,
  ).toBe(false);
});
