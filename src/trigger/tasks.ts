import { task, schedules } from "@trigger.dev/sdk/v3";
import { dispatch, cleanup } from "../features/scheduling/worker";
import { executeRun, retryAudio } from "../features/generation/pipeline";
export const generate = task({
  id: "generate-brief",
  maxDuration: 600,
  retry: { maxAttempts: 3 },
  queue: { name: "generation", concurrencyLimit: 1 },
  run: async (payload: { runId: string }) => executeRun(payload.runId),
});
export const retryNarration = task({
  id: "retry-narration",
  maxDuration: 600,
  retry: { maxAttempts: 1 },
  queue: { name: "generation", concurrencyLimit: 1 },
  run: async (payload: { jobId: string }) => retryAudio(payload.jobId),
});
export const dispatcher = schedules.task({
  id: "dispatch-briefs",
  cron: { pattern: "*/2 * * * *", environments: ["PRODUCTION"] },
  maxDuration: 60,
  run: async () => {
    const work = await dispatch();
    for (const id of work.runs) await generate.trigger({ runId: id });
    for (const id of work.audio) await retryNarration.trigger({ jobId: id });
  },
});
export const housekeeping = schedules.task({
  id: "private-housekeeping",
  cron: { pattern: "17 3 * * *", environments: ["PRODUCTION"] },
  maxDuration: 120,
  run: cleanup,
});
