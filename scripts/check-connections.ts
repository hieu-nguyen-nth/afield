import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());
const { adminClient, command } =
  await import("../src/infrastructure/database/database");
const { textModel } = await import("../src/infrastructure/providers/models");
const configuredTextModel = textModel();
const db = adminClient();
const read = await db.from("topics").select("id").limit(1);
console.log(JSON.stringify({ check: "Supabase server key", ok: !read.error }));
const cfg = await fetch(
  process.env.NEXT_PUBLIC_SUPABASE_URL + "/auth/v1/settings",
  {
    headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY! },
    signal: AbortSignal.timeout(15000),
  },
);
const auth = cfg.ok ? await cfg.json() : null;
console.log(
  JSON.stringify({
    check: "Google OAuth enabled in Supabase",
    ok: !!auth?.external?.google,
    httpStatus: cfg.status,
  }),
);
const models = await fetch(
  "https://generativelanguage.googleapis.com/v1beta/models",
  {
    headers: { "x-goog-api-key": process.env.GEMINI_API_KEY! },
    signal: AbortSignal.timeout(15000),
  },
);
const list = models.ok ? await models.json() : null;
const textAvailable = !!list?.models?.some(
  (m: { name: string }) => m.name === `models/${configuredTextModel}`,
);
console.log(
  JSON.stringify({
    check: "Gemini key and configured text model",
    keyAccepted: models.ok,
    modelAvailable: textAvailable,
    httpStatus: models.status,
    availableTextModels: list?.models
      ?.filter(
        (m: { name: string; supportedGenerationMethods?: string[] }) =>
          m.supportedGenerationMethods?.includes("generateContent") &&
          /flash/.test(m.name) &&
          !/image|tts|live|audio|robotics|lite/.test(m.name),
      )
      .map((m: { name: string }) => m.name),
  }),
);
if (textAvailable) {
  try {
    const { gemini } =
      await import("../src/infrastructure/providers/providers");
    const { z } = await import("zod");
    const r = await gemini(
      "Return ok=true. This is a minimal connection check, not research.",
      z.object({ ok: z.boolean() }),
      {},
    );
    console.log(
      JSON.stringify({ check: "One tiny Gemini text call", ok: r.ok }),
    );
  } catch {
    console.log(
      JSON.stringify({ check: "One tiny Gemini text call", ok: false }),
    );
  }
}
await command("reserve_usage", { p_metric: "tavily", p_amount: 1 });
const searched = await fetch("https://api.tavily.com/search", {
  method: "POST",
  headers: {
    Authorization: "Bearer " + process.env.TAVILY_API_KEY,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    query: "enterprise AI adoption recent developments",
    search_depth: "basic",
    max_results: 1,
    include_answer: false,
    include_raw_content: false,
  }),
  signal: AbortSignal.timeout(20000),
});
const results = searched.ok ? await searched.json() : null;
console.log(
  JSON.stringify({
    check: "One basic Tavily search",
    ok: searched.ok,
    httpStatus: searched.status,
    resultCount: results?.results?.length ?? 0,
  }),
);
