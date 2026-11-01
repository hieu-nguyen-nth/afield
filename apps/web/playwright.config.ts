import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";
const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
export default defineConfig({
  testDir: "./tests/browser",
  workers: 1,
  use: {
    baseURL: "http://localhost:3100",
    viewport: { width: 1440, height: 1000 },
    launchOptions: existsSync(chrome) ? { executablePath: chrome } : {},
  },
  webServer: {
    command: "npm run start -- --port 3100",
    url: "http://localhost:3100",
    reuseExistingServer: false,
    env: {
      APP_URL: "http://localhost:3100",
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-publishable-key",
      SUPABASE_SECRET_KEY: "",
      GEMINI_API_KEY: "",
      TAVILY_API_KEY: "",
      TRIGGER_SECRET_KEY: "",
      LIVE_GENERATION_ENABLED: "false",
      FREE_TIERS_VERIFIED: "false",
      EXECUTION_MODE: "local",
    },
  },
  reporter: "list",
});
