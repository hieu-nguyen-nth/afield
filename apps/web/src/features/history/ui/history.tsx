"use client";
import { useState, useEffect, useCallback } from "react";

import { PageHeading } from "@/shared/ui/page-heading";
import { Empty } from "@/shared/ui/empty";
import { BriefCard } from "@/features/briefs/ui/brief-card";
import type { Topic } from "@/features/topics/models";
import type { BriefRow } from "@/features/briefs/models";
import { api } from "@/shared/http/client";
export function History({
  topics,
  onOpen,
  onError,
}: {
  topics: Topic[];
  onOpen: (id: string) => Promise<void>;
  onError: (e: unknown) => void;
}) {
  const [items, setItems] = useState<BriefRow[]>([]),
    [intent, setIntent] = useState(""),
    [topic, setTopic] = useState(""),
    [date, setDate] = useState(""),
    [cursor, setCursor] = useState<string | null>(null),
    [month, setMonth] = useState(
      () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    );
  const query = useCallback(() => {
    const p = new URLSearchParams();
    if (intent) p.set("intent", intent);
    if (topic) p.set("topic", topic);
    if (date) {
      p.set("date", date);
      p.set("timezone", Intl.DateTimeFormat().resolvedOptions().timeZone);
    }
    return p;
  }, [intent, topic, date]);
  useEffect(() => {
    let active = true;
    void api<{ items: BriefRow[]; cursor: string | null }>("briefs?" + query())
      .then((r) => {
        if (active) {
          setItems(r.items);
          setCursor(r.cursor);
        }
      })
      .catch(onError);
    return () => {
      active = false;
    };
  }, [query, onError]);
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate(),
    offset = (month.getDay() + 6) % 7;
  return (
    <>
      <PageHeading
        eyebrow="COME BACK TO WHAT YOU LEARNED"
        title="Your library of curiosity"
        text="Every exploration and update, saved with its sources."
      />
      <div className="history-layout">
        <aside className="panel calendar">
          <div className="row">
            <button
              aria-label="Previous month"
              onClick={() =>
                setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
              }
            >
              ‹
            </button>
            <strong>
              {month.toLocaleDateString(undefined, {
                month: "long",
                year: "numeric",
              })}
            </strong>
            <button
              aria-label="Next month"
              onClick={() =>
                setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
              }
            >
              ›
            </button>
          </div>
          <div className="calendar-grid">
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
              <span key={i} className="weekday">
                {d}
              </span>
            ))}
            {Array.from({ length: offset }, (_, i) => (
              <span key={"offset" + i} />
            ))}
            {Array.from({ length: days }, (_, i) => {
              const d = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`;
              return (
                <button
                  key={d}
                  className={date === d ? "selected" : ""}
                  onClick={() => setDate(date === d ? "" : d)}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
          <button className="text-button" onClick={() => setDate("")}>
            Show all dates
          </button>
          <small>
            Dates use {Intl.DateTimeFormat().resolvedOptions().timeZone}. Topic
            schedules keep their own timezone.
          </small>
        </aside>
        <div>
          <div className="history-filters">
            <select
              aria-label="Filter by mode"
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
            >
              <option value="">All briefs</option>
              <option value="explore">Explorations</option>
              <option value="update">Topic updates</option>
            </select>
            <select
              aria-label="Filter by topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            >
              <option value="">All topics</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            {date && <span className="pill">{date}</span>}
          </div>
          {items.length ? (
            <div className="brief-grid">
              {items.map((b) => (
                <BriefCard
                  key={b.id}
                  brief={b}
                  onOpen={() => void onOpen(b.id)}
                />
              ))}
            </div>
          ) : (
            <Empty
              title="A little space for the next discovery"
              text="Your briefs will appear here. A day can hold more than one exploration or update."
            />
          )}
          {cursor && (
            <button
              className="button"
              onClick={async () => {
                try {
                  const q = query();
                  q.set("cursor", cursor);
                  const r = await api<{
                    items: BriefRow[];
                    cursor: string | null;
                  }>("briefs?" + q);
                  setItems((v) => [...v, ...r.items]);
                  setCursor(r.cursor);
                } catch (e) {
                  onError(e);
                }
              }}
            >
              Load earlier briefs
            </button>
          )}
        </div>
      </div>
    </>
  );
}
