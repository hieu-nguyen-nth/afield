import { adminClient, command } from "../../infrastructure/database/database";
import { requireLive } from "../../config/env";
import { executeRun } from "../generation/pipeline";
import { retryAudio } from "../audio/service";
import { nextOccurrence, occurrenceKey } from "./schedule";
import type { TopicConfig } from "@/features/topics/models";
export async function dispatch() {
  requireLive();
  const db = adminClient();
  const due = await db
    .from("schedules")
    .select("*")
    .lte("next_at", new Date().toISOString())
    .limit(20);
  for (const schedule of due.data ?? []) {
    const topic = await db
      .from("topics")
      .select("config,status")
      .eq("id", schedule.topic_id)
      .eq("owner_id", schedule.owner_id)
      .single();
    if (topic.data?.status !== "active") continue;
    const config = topic.data.config as TopicConfig;
    try {
      await command("schedule_occurrence", {
        p_topic: schedule.topic_id,
        p_expected: schedule.next_at,
        p_next: nextOccurrence(config.schedule),
        p_key:
          "scheduled:" +
          occurrenceKey(
            schedule.topic_id,
            schedule.next_at,
            config.schedule.timezone,
          ),
      });
    } catch {
      /* Quota is persisted; never advance the checkpoint or pay for an overflow. */
    }
  }
  const pending = await db
    .from("runs")
    .select("id,next_eligible_at")
    .in("status", ["queued", "running"])
    .or(`lease_until.is.null,lease_until.lte.${new Date().toISOString()}`)
    .order("created_at", { ascending: true })
    .limit(30);
  const runnable = (pending.data ?? []).filter(
    (r) => !r.next_eligible_at || Date.parse(r.next_eligible_at) <= Date.now(),
  );
  const audio = await db
    .from("audio_jobs")
    .select("id")
    .in("status", ["queued", "running"])
    .order("created_at", { ascending: true })
    .limit(10);
  return {
    runs: runnable.map((r) => r.id),
    audio: (audio.data ?? []).map((a) => a.id),
  };
}
export async function tick() {
  const pending = await dispatch();
  for (const id of pending.runs) await executeRun(id);
  for (const id of pending.audio) await retryAudio(id);
}
export async function cleanup() {
  const db = adminClient();
  await command("retain_private_data", {});
  const old = await command("orphan_audio", {});
  for (const asset of old ?? []) {
    const removeObject = await command("can_remove_audio_object", {
      p_id: asset.id,
    });
    if (removeObject) {
      const removed = await db.storage
        .from("brief-audio")
        .remove([asset.storage_path]);
      if (removed.error) continue;
    }
    await command("release_audio", { p_id: asset.id });
  }
  const deletions = await db
    .from("profiles")
    .select("id")
    .not("deleted_at", "is", null);
  if (deletions.error) throw new Error("Cleanup query failed");
  for (const profile of deletions.data ?? []) {
    const assets = await db
      .from("audio_assets")
      .select("storage_path")
      .eq("owner_id", profile.id);
    if (assets.error) continue;
    const paths = [...new Set((assets.data ?? []).map((x) => x.storage_path))];
    if (paths.length) {
      const removed = await db.storage.from("brief-audio").remove(paths);
      if (removed.error) continue;
    }
    await db.auth.admin.deleteUser(profile.id);
  }
}
