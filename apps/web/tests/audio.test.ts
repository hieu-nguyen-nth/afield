import { it, expect } from "vitest";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { audioTool } from "../src/features/audio/audio-tools";
it("encodes and measures a real local MP3 without provider calls", async () => {
  const run = promisify(execFile);
  const dir = await mkdtemp(join(tmpdir(), "brief-audio-test-"));
  try {
    const path = join(dir, "synthetic.mp3");
    await run(await audioTool("ffmpeg"), [
      "-nostdin",
      "-v",
      "error",
      "-f",
      "lavfi",
      "-i",
      "sine=frequency=440:duration=1",
      "-ac",
      "1",
      "-b:a",
      "64k",
      path,
    ]);
    const measured = await run(await audioTool("ffprobe"), [
      "-v",
      "quiet",
      "-show_entries",
      "format=duration",
      "-of",
      "csv=p=0",
      path,
    ]);
    expect(Number(measured.stdout.trim())).toBeGreaterThanOrEqual(1);
    expect(Number(measured.stdout.trim())).toBeLessThan(1.2);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
