// Keep the generation grammar small; the original Zod schema still validates
// every response, including lengths, array bounds and formats, before use.
export function providerSchema(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(providerSchema);
  if (!value || typeof value !== "object") return value;
  const localConstraints = new Set([
    "$schema",
    "minLength",
    "maxLength",
    "minItems",
    "maxItems",
    "minimum",
    "maximum",
    "exclusiveMinimum",
    "exclusiveMaximum",
    "pattern",
    "format",
  ]);
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !localConstraints.has(key))
      .map(([key, child]) => [key, providerSchema(child)]),
  );
}
