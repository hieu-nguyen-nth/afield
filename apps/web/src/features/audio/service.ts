import { z } from "zod";
import { randomUUID } from "node:crypto";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";

import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { adminClient, command } from "@/infrastructure/database/database";

import { requireLive } from "@/config/env";
import type { Content } from "@/features/briefs/models";
import type { Run } from "@/features/generation/models";
import {
  gemini,
  speech,
  transcribe,
  type GenerationMeter,
} from "@/infrastructure/providers/providers";

import { hash, prose } from "@/core/limits";

import { AppError } from "@/core/errors";
import { audioTool } from "@/features/audio/audio-tools";
const verdict = z.object({
  supported: z.boolean(),
  reason: z.string().max(2000),
});
const exec = promisify(execFile);
export function normalizedSpeech(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}
export async function audioFor(
  run: Run,
  content: Content,
  meter: GenerationMeter,
  checkpoint: () => Promise<void>,
  attempt = 1,
) {
  await checkpoint();
  const text = prose(content);
  const raw = await speech(text);
  await checkpoint();
  const dir = await mkdtemp(join(tmpdir(), "afield-"));
  try {
    const wav = join(dir, "voice.wav"),
      mp3 = join(dir, "voice.mp3");
    await writeFile(wav, raw, { mode: 0o600 });
    await exec(
      await audioTool("ffmpeg"),
      ["-nostdin", "-v", "error", "-i", wav, "-ac", "1", "-b:a", "64k", mp3],
      { timeout: 60000, maxBuffer: 10000 },
    );
    const probe = await exec(
      await audioTool("ffprobe"),
      [
        "-v",
        "quiet",
        "-show_entries",
        "format=duration",
        "-of",
        "csv=p=0",
        mp3,
      ],
      { timeout: 15000, maxBuffer: 10000 },
    );
    const duration = Number(probe.stdout.trim());
    if (!Number.isFinite(duration) || duration <= 0)
      throw new AppError(
        "audio_failed",
        "Audio duration could not be verified.",
      );
    if (
      run.snapshot.limit.type === "duration" &&
      duration > run.snapshot.limit.value
    )
      throw new AppError(
        "budget_not_met",
        `Measured narration exceeds the ${run.snapshot.limit.value}-second ceiling.`,
      );
    const bytes = await readFile(mp3);
    if (bytes.length > 15000000)
      throw new AppError(
        "audio_failed",
        "The audio exceeds the safe file size.",
      );
    const transcript = await transcribe(bytes);
    await checkpoint();
    if (normalizedSpeech(transcript) !== normalizedSpeech(text)) {
      const match = await gemini(
        "Compare the exact narration script against a separate transcription. Supported is true only when substantive content, order, all names, amounts, dates and negations match. Pronunciation and punctuation differences are allowed. Missing sentences, summarization or added claims are failures.",
        verdict,
        { script: text, transcript },
        meter,
      );
      if (!match.supported)
        throw new AppError(
          "audio_failed",
          "The narration did not pass its content-equivalence check.",
        );
    }
    await command("reserve_usage", {
      p_metric: "storage",
      p_amount: bytes.length,
    });
    const id = randomUUID(),
      textHash = hash(text),
      path = `${run.owner_id}/${run.id}/${id}.mp3`;
    const db = adminClient();
    const saved = await db.from("audio_assets").insert({
      id,
      owner_id: run.owner_id,
      run_id: run.id,
      text_hash: textHash,
      profile_key: "gemini-3.8-flash-tts:Kore:mp3-mono-64k:equivalence-v1",
      voice: {
        provider: "gemini",
        model: "gemini-3.8-flash-tts",
        voice: "Kore",
        normalSpeed: true,
      },
      storage_path: path,
      duration,
      byte_size: bytes.length,
      status: "processing",
      attempt,
    });
    if (saved.error)
      throw new AppError("audio_failed", "Audio metadata could not be saved.");
    const upload = await db.storage
      .from("brief-audio")
      .upload(path, bytes, { contentType: "audio/mpeg", upsert: false });
    if (upload.error)
      throw new AppError("audio_failed", "Private media could not be saved.");
    await checkpoint();
    const ready = await db
      .from("audio_assets")
      .update({ status: "ready" })
      .eq("id", id)
      .eq("owner_id", run.owner_id);
    if (ready.error)
      throw new AppError(
        "audio_failed",
        "Audio verification could not be saved.",
      );
    return id;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
export async function retryAudio(jobId: string) {
  requireLive();
  const job = await command("claim_audio", { p_id: jobId });
  if (!job) return;
  const db = adminClient();
  const { data: b, error } = await db
    .from("briefs")
    .select("*")
    .eq("id", job.brief_id)
    .eq("owner_id", job.owner_id)
    .single();
  if (error || !b || b.selected_audio_id) {
    await command("touch_audio", {
      p_id: jobId,
      p_token: job.lease_token,
      p_done: true,
    });
    return;
  }
  const { data: r } = await db
    .from("runs")
    .select("*")
    .eq("id", b.run_id)
    .eq("owner_id", job.owner_id)
    .single();
  if (!r) return;
  const touch = async () => {
    await command("touch_audio", {
      p_id: jobId,
      p_token: job.lease_token,
      p_done: false,
    });
  };
  const timer = setInterval(() => {
    void touch().catch(() => {});
  }, 30000);
  try {
    // A recovered job can reuse an uploaded verified asset without another call.
    const cached = await command("reuse_audio", { p_brief: b.id });
    if (cached) return;
    const audio = await audioFor(
      r,
      b.content,
      { input: 0, output: 0, calls: 0 },
      touch,
      1,
    );
    await touch();
    await command("attach_audio", {
      p_brief: b.id,
      p_audio: audio,
      p_error: null,
    });
  } catch {
    await command("attach_audio", {
      p_brief: b.id,
      p_audio: null,
      p_error:
        "The saved text could not produce verified audio. A shorter brief requires a new request.",
    });
  } finally {
    clearInterval(timer);
    await command("touch_audio", {
      p_id: jobId,
      p_token: job.lease_token,
      p_done: true,
    });
  }
}
