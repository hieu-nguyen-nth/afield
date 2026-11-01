import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());
const { tick, cleanup } = await import("../src/features/scheduling/worker");
console.log(
  "Local worker started. No request bodies, credentials, or document text are logged.",
);
let lastCleanup = 0;
for (;;) {
  try {
    if (Date.now() - lastCleanup > 86400000) {
      await cleanup();
      lastCleanup = Date.now();
    }
    await tick();
  } catch {
    console.log(
      "Worker paused: complete setup, verify the free plan, and enable generation.",
    );
  }
  await new Promise((r) => setTimeout(r, 15000));
}
