import { createRequire } from "node:module";
import { chmod } from "node:fs/promises";
const require = createRequire(import.meta.url);
export async function audioTool(name: "ffmpeg" | "ffprobe") {
  const override =
    process.env[name === "ffmpeg" ? "FFMPEG_PATH" : "FFPROBE_PATH"];
  if (override) return override;
  if (process.env.EXECUTION_MODE === "cloud") return name;
  const installed = require(
    name === "ffmpeg"
      ? "@ffmpeg-installer/ffmpeg"
      : "@ffprobe-installer/ffprobe",
  ) as { path: string };
  // Some package managers block the installer's chmod-only postinstall script.
  if (process.platform !== "win32") await chmod(installed.path, 0o755);
  return installed.path;
}
