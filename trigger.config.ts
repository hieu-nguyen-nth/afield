import { defineConfig } from "@trigger.dev/sdk/v3";
import { ffmpeg } from "@trigger.dev/build/extensions/core";
export default defineConfig({
  project: process.env.TRIGGER_PROJECT_REF || "not-configured",
  runtime: "node",
  dirs: ["./src/trigger"],
  maxDuration: 600,
  build: { extensions: [ffmpeg()] },
  retries: {
    enabledInDev: false,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 2000,
      maxTimeoutInMs: 15000,
      factor: 2,
      randomize: true,
    },
  },
});
