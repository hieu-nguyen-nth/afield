"use client";
import { ArrowUpRight } from "lucide-react";
import type { BriefRow } from "@/features/briefs/models";
import { dateLabel } from "@/shared/format/date";
export function BriefCard({
  brief: b,
  onOpen,
}: {
  brief: BriefRow;
  onOpen: () => void;
}) {
  return (
    <button className="brief-card" onClick={onOpen}>
      <div className="row">
        <span className="eyebrow">
          {b.intent === "explore" ? "EXPLORATION" : "TOPIC UPDATE"}
        </span>
        <ArrowUpRight size={17} />
      </div>
      <h3>{b.title}</h3>
      <p className="brief-summary">
        {b.summary ||
          "Open to read the answer, original request and source coverage."}
      </p>
      <div className="brief-meta">
        <span>{dateLabel(b.created_at)}</span>
        <span>
          {b.word_count} words{" "}
          {b.audio_status === "ready" ? "· Audio ready" : ""}
        </span>
      </div>
    </button>
  );
}
