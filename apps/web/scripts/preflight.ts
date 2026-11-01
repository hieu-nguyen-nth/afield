import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());
const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
  "GEMINI_API_KEY",
];
console.log("Afield readiness (names/status only; no keys are printed)");
for (const name of required)
  console.log(`${process.env[name] ? "READY" : "MISSING"} ${name}`);
for (const name of [
  "TAVILY_API_KEY",
  "TRIGGER_SECRET_KEY",
  "TRIGGER_PROJECT_REF",
])
  console.log(`${process.env[name] ? "CONNECTED" : "OPTIONAL"} ${name}`);
console.log(`Execution: ${process.env.EXECUTION_MODE || "local"}`);
console.log(
  `Free-tier verification: ${process.env.FREE_TIERS_VERIFIED === "true" ? "attested" : "not attested"}`,
);
console.log(
  `Live generation: ${process.env.LIVE_GENERATION_ENABLED === "true" ? "enabled" : "disabled"}`,
);
if (!required.every((k) => !!process.env[k])) process.exitCode = 1;
