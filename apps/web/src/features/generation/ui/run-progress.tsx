"use client";
import { useEffect, useState } from "react";
import { Check, Clock, Download, RefreshCw } from "lucide-react";
import type { Run } from "@/features/generation/models";

const stages = [
  [
    "queued",
    "Waiting to start",
    "The local worker checks for saved requests every 15 seconds.",
  ],
  [
    "researching",
    "Reading sources",
    "Checking your sources and collecting passages to support the answer.",
  ],
  [
    "writing",
    "Writing your brief",
    "Asking the AI to turn those passages into a useful answer.",
  ],
  [
    "validating",
    "Checking the answer",
    "Reviewing claims, citations and length before saving your brief.",
  ],
  [
    "completed",
    "Ready to read",
    "Your text is saved. Audio is optional and starts only when you request it.",
  ],
] as const;
const label = (stage: string) =>
  stages.find(([key]) => key === stage)?.[1] ||
  ({
    failed: "Could not finish",
    skipped: "Request skipped",
    waiting_for_quota: "Waiting for allowance",
    publishing: "Saving your brief",
  }[stage] ??
    stage.replaceAll("_", " "));
const duration = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
const time = (date: string) =>
  new Date(date).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });

export function RunProgress({
  run,
  loadError,
  onReload,
  onRetry,
}: {
  run: Run | null;
  loadError: string;
  onReload: () => void;
  onRetry: () => Promise<void>;
}) {
  const [now, setNow] = useState(() => Date.now());
  const [retrying, setRetrying] = useState(false);
  const terminal =
    !!run && ["failed", "completed", "skipped"].includes(run.status);
  useEffect(() => {
    if (terminal) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [terminal]);
  const events = run?.events ?? [];
  const latestStart = events.findLast(
    (event) => event.stage === "queued" || event.status === "queued",
  );
  const start = latestStart?.created_at || run?.created_at;
  const end = terminal && run?.updated_at ? Date.parse(run.updated_at) : now;
  const elapsed = start
    ? Math.max(0, Math.floor((end - Date.parse(start)) / 1000))
    : 0;
  const estimate = Math.max(0, 300 - elapsed);
  const stale =
    !terminal &&
    run?.status === "running" &&
    run.updated_at &&
    now - Date.parse(run.updated_at) > 90000;
  const stage = run?.status === "queued" ? "queued" : run?.stage;
  const canRetry =
    run?.status === "failed" &&
    (run.attempts ?? 1) < 3 &&
    (run.error?.retryable || run.error?.code === "generation_failed");
  const currentIndex = stages.findIndex(([key]) => key === stage);
  function downloadLog() {
    if (!run) return;
    const lines = [
      `Afield request ${run.id}`,
      `Status: ${run.status}`,
      `Attempt: ${run.attempts ?? 1}`,
      `Saved: ${run.created_at}`,
      ...events.map(
        (e) =>
          `${e.created_at} — ${label(e.stage)}${e.error_code ? ` (${e.error_code})` : ""}`,
      ),
      ...(run.error ? [`Error: ${run.error.message}`] : []),
    ];
    const url = URL.createObjectURL(
      new Blob([lines.join("\n")], { type: "text/plain" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `afield-request-${run.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">YOUR REQUEST, STEP BY STEP</span>
          <h1>{terminal ? "Your request" : "Making your brief"}</h1>
          <p>
            Your request is saved. You can leave this page and return while the
            local worker is running.
          </p>
        </div>
      </div>
      <div className="panel run-progress">
        <div className="run-summary">
          <div>
            <span className="eyebrow">
              {run ? `ATTEMPT ${run.attempts ?? 1}` : "CONNECTING"}
            </span>
            <h2 aria-live="polite">
              {run
                ? label(stage || run.stage)
                : loadError
                  ? "Could not load this request"
                  : "Checking saved progress…"}
            </h2>
            <p>{run?.snapshot?.prompt}</p>
          </div>
          {!terminal && !loadError && (
            <RefreshCw className="run-spinner" size={24} aria-hidden="true" />
          )}
        </div>
        {loadError && (
          <div className="notice error" role="alert">
            {loadError}
            <button className="button" onClick={onReload}>
              Check status again
            </button>
          </div>
        )}
        {run && (
          <>
            <div className="run-timing">
              <span>
                <Clock size={16} /> {terminal ? "Attempt duration" : "Elapsed"}:{" "}
                <strong>{duration(elapsed)}</strong>
              </span>
              {!terminal && (
                <span>
                  {estimate > 0 ? (
                    <>
                      Estimated window ends in{" "}
                      <strong>{duration(estimate)}</strong>
                    </>
                  ) : (
                    "Taking longer than the initial estimate"
                  )}
                </span>
              )}
            </div>
            {!terminal && (
              <p className="run-estimate">
                Plan for about 2–5 minutes for a text brief. This is an initial
                estimate, not a measured completion time; source access, AI
                availability and checks can make it longer. Audio is separate.
              </p>
            )}
            {stale && (
              <div className="notice">
                No recent worker update. This may be a slow provider call or a
                paused local worker. Keep the local worker running; your request
                remains saved.
              </div>
            )}
            <ol className="run-steps" aria-label="Brief progress">
              {stages.map(([key, title, detail], i) => (
                <li
                  key={key}
                  className={
                    stage === key ? "current" : currentIndex > i ? "done" : ""
                  }
                  aria-current={stage === key ? "step" : undefined}
                >
                  <span className="step-marker">
                    {currentIndex > i ? <Check size={14} /> : i + 1}
                  </span>
                  <div>
                    <strong>{title}</strong>
                    <p>{detail}</p>
                  </div>
                </li>
              ))}
            </ol>
            {run.error && (
              <div className="notice error" role="alert">
                {run.error.message}
              </div>
            )}
            {run.status === "failed" && (
              <p>
                Your saved attempt has stopped. It is not still processing.
                {canRetry
                  ? " Retry when you’re ready."
                  : " Download the activity log to review the problem with the app owner."}
              </p>
            )}
            {run.next_eligible_at && (
              <p>
                Next allowance check:{" "}
                {new Date(run.next_eligible_at).toLocaleString()}.
              </p>
            )}
            <div className="actions">
              {canRetry && (
                <button
                  className="button primary"
                  disabled={retrying}
                  onClick={async () => {
                    setRetrying(true);
                    try {
                      await onRetry();
                    } finally {
                      setRetrying(false);
                    }
                  }}
                >
                  {retrying ? "Starting retry…" : "Retry this request"}
                </button>
              )}
              <button className="button" onClick={downloadLog}>
                <Download size={15} /> Download activity log
              </button>
              <button className="text-button" onClick={onReload}>
                Refresh status
              </button>
            </div>
            <section className="run-activity">
              <div className="section-heading">
                <h3>Activity log</h3>
                <span className="fine-print">
                  Updates from the saved request
                </span>
              </div>
              <ol>
                <li>
                  <time dateTime={run.created_at}>{time(run.created_at)}</time>
                  <span>Request saved</span>
                </li>
                {events.map((event) => (
                  <li key={event.id}>
                    <time dateTime={event.created_at}>
                      {time(event.created_at)}
                    </time>
                    <span>
                      {label(event.stage)}
                      {event.error_code && (
                        <small>
                          {" "}
                          · {event.error_code.replaceAll("_", " ")}
                        </small>
                      )}
                    </span>
                  </li>
                ))}
              </ol>
              {run.updated_at && (
                <p className="fine-print">
                  Last worker update: {time(run.updated_at)}
                </p>
              )}
            </section>
          </>
        )}
      </div>
    </>
  );
}
