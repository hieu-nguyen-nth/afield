"use client";
import { ArrowRight } from "lucide-react";
import { Run } from "@/features/generation/models";
import { PageHeading } from "@/shared/ui/page-heading";
import type { AccountSummary } from "@/features/account/models";
import { dateLabel } from "@/shared/format/date";
export function AccountView({
  me,
  runs,
  onOpenRun,
}: {
  me: AccountSummary;
  runs: Run[];
  onOpenRun: (id: string) => void;
}) {
  const now = new Date();
  const reset =
    me.usage.resetsAt ||
    new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
    ).toISOString();
  const dailyReset =
    me.usage.dailyResetsAt ||
    new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
    ).toISOString();
  const periodStart = new Date(reset);
  periodStart.setUTCMonth(periodStart.getUTCMonth() - 1);
  const periodLabel = periodStart.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return (
    <>
      <PageHeading
        eyebrow="YOUR ACCOUNT"
        title="Account & usage"
        text={me.user.email}
      />
      <div className="panel usage-panel">
        <h2>Shared brief allowance</h2>
        <p className="fine-print">
          Current quota month: {periodLabel} (UTC calendar)
        </p>
        <p className="usage-total">
          <strong>{me.usage.runs}</strong> of {me.usage.limit} requests reserved
          this month · {Math.max(0, me.usage.limit - me.usage.runs)} remaining
        </p>
        <p>
          This personal app shares its allowance across approved users. A
          request reserves one slot when submitted, even if it fails. Retrying
          the same request reuses that slot. This is an app limit, not a bill or
          a measure of AI tokens.
        </p>
        <dl>
          <dt>Monthly reset</dt>
          <dd>{new Date(reset).toLocaleString()} in your timezone</dd>
          <dt>Daily limit</dt>
          <dd>
            3 requests shared across the app; resets{" "}
            {new Date(dailyReset).toLocaleString()}
          </dd>
        </dl>
        <p className="fine-print">
          The allowance follows UTC calendar days and months. Provider limits
          for text, search and audio are separate and may temporarily stop
          processing.
        </p>
      </div>
      <section className="account-history">
        <div className="section-heading">
          <h2>Your request history</h2>
          <span className="fine-print">Up to 30 most recent requests</span>
        </div>
        <p>
          Each row represents one reservation. Multiple attempts within that
          request do not use another brief slot.
        </p>
        {runs.length ? (
          runs.map((run) => (
            <button
              className="run-row"
              key={run.id}
              onClick={() => onOpenRun(run.id)}
            >
              <span>
                <strong>
                  {run.snapshot?.prompt ||
                    (run.intent === "explore" ? "Exploration" : "Topic update")}
                </strong>
                <small>
                  {dateLabel(run.created_at)} · {run.attempts ?? 1} attempt(s) ·
                  1 reserved slot
                </small>
              </span>
              <span className="pill">{run.status}</span>
              <ArrowRight size={14} />
            </button>
          ))
        ) : (
          <p>No saved requests yet.</p>
        )}
      </section>
    </>
  );
}
