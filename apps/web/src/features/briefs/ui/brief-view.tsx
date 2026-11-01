"use client";
import { useState, useEffect, useCallback, useRef } from "react";

import { ArrowUpRight, ArrowRight, Headphones, ArrowLeft } from "lucide-react";

import { Brief } from "@/features/briefs/models";
import { api } from "@/shared/http/client";
import { dateLabel } from "@/shared/format/date";
export function BriefView({
  onRevise,
  brief: b,
  onConvert,
  onAudioRequested,
  onError,
  onBack,
}: {
  onRevise: () => void;
  brief: Brief;
  onConvert: () => Promise<void>;
  onAudioRequested: () => void;
  onError: (e: unknown) => void;
  onBack: () => void;
}) {
  const [audio, setAudio] = useState<{ url: string; duration: number } | null>(
      null,
    ),
    [speed, setSpeed] = useState(1),
    [rating, setRating] = useState(0),
    [saved, setSaved] = useState(false),
    [notes, setNotes] = useState(""),
    [retryQueued, setRetryQueued] = useState(false);
  const player = useRef<HTMLAudioElement | null>(null),
    renewed = useRef(false);
  const fetchAudio = useCallback(async () => {
    try {
      setAudio(await api("briefs/" + b.id + "/audio"));
    } catch (e) {
      onError(e);
    }
  }, [b.id, onError]);
  useEffect(() => {
    if (b.audio_status !== "ready") return;
    let active = true;
    void api<{ url: string; duration: number }>("briefs/" + b.id + "/audio")
      .then((v) => {
        if (active) setAudio(v);
      })
      .catch(onError);
    return () => {
      active = false;
    };
  }, [b.audio_status, b.id, onError]);
  return (
    <article className="reading-page">
      <button className="text-button" onClick={onBack}>
        <ArrowLeft size={15} /> Back to history
      </button>
      <div className="reading-header">
        <span className="eyebrow">
          {b.intent === "explore" ? "AN EXPLORATION" : "YOUR TOPIC UPDATE"} ·{" "}
          {dateLabel(b.created_at)}
        </span>
        <h1>{b.title}</h1>
        <div className="reading-meta">
          <span>{b.word_count} words</span>
          <span>
            {
              (
                {
                  sources_only: "My sources only",
                  web_only: "Web only",
                  sources_and_web: "My sources + web",
                } as Record<string, string>
              )[
                String(
                  b.snapshot.sourceMode ||
                    (b.snapshot.topic?.researchPolicy ===
                    "approved_plus_discovery"
                      ? "sources_and_web"
                      : "sources_only"),
                )
              ]
            }
          </span>
          <span className="pill">
            {b.snapshot.limit.type === "words"
              ? `Up to ${b.snapshot.limit.value} words`
              : `Up to ${b.snapshot.limit.value / 60} minutes`}
          </span>
          <span>
            {b.snapshot.limit.type === "duration"
              ? b.budget_status === "met"
                ? "Listening time verified"
                : b.budget_status === "not_met"
                  ? "Listening limit not met"
                  : "Listening time unverified"
              : "Word ceiling verified"}
          </span>
        </div>
      </div>
      <details className="request-details">
        <summary>Original request & source coverage</summary>
        <button className="button" onClick={onRevise}>
          Revise this exploration
        </button>
        <h3>Your question</h3>
        <p>{b.snapshot.prompt}</p>
        {b.snapshot.preferences && (
          <>
            <h3>Your context</h3>
            <p>{b.snapshot.preferences}</p>
          </>
        )}
        <p>
          Depth: {String(b.snapshot.depth || "working")} · Source mode:{" "}
          {String(b.snapshot.sourceMode || "sources_only").replaceAll("_", " ")}
        </p>
        <h3>Sources you selected</h3>
        <ul>
          {(
            (b.snapshot.sources as
              { url: string; scope: string }[] | undefined) ||
            b.snapshot.topic?.sources ||
            []
          ).map((source, index) => (
            <li key={index}>
              <a href={source.url} target="_blank" rel="noreferrer">
                {source.url}
              </a>{" "}
              ·{" "}
              {source.scope === "page"
                ? "Exact page only"
                : source.scope === "search"
                  ? "Search within this site"
                  : source.scope === "site"
                    ? "Linked pages from this URL"
                    : "Feed articles"}
            </li>
          ))}
        </ul>
        <h3>What was retrieved and used</h3>
        {b.sourceChecks?.length ? (
          <ul>
            {b.sourceChecks.map((check, index) => (
              <li key={index}>
                <strong>{check.scope}</strong>
                <span>
                  {check.document_count} page(s) retrieved · {check.outcome}
                  {b.citations.some((c) => c.url === check.scope)
                    ? " · cited in the answer"
                    : " · not directly cited"}
                </span>
                {check.reason && <p>{check.reason}</p>}
              </li>
            ))}
          </ul>
        ) : (
          <p>
            Detailed source checks are unavailable for this saved brief. The
            references below show what was cited.
          </p>
        )}
        <p>
          Retrieving a source does not mean every part supports your question. A
          homepage set to Exact page is not a search of its articles. A
          shortened or single-source answer should be read with these limits in
          mind.
        </p>
      </details>
      {b.partial && (
        <div className="notice">
          Some sources or portions of their coverage could not be fully checked.
          Read the limitations below.
        </div>
      )}
      <div className="audio-panel">
        <span className="card-icon">
          <Headphones size={23} />
        </span>
        <div className="audio-main">
          <strong>
            {b.audio_status === "ready"
              ? "Listen to this brief"
              : "Your text is ready"}
          </strong>
          {audio ? (
            <>
              <audio
                ref={player}
                controls
                preload="none"
                src={audio.url}
                onError={() => {
                  if (renewed.current) return;
                  renewed.current = true;
                  const position = player.current?.currentTime || 0;
                  void fetchAudio().then(() => {
                    if (player.current) {
                      player.current.currentTime = position;
                    }
                  });
                }}
              />
              <small>
                Measured at 1×: {Math.floor(audio.duration / 60)}:
                {String(Math.round(audio.duration % 60)).padStart(2, "0")}.
                Voice generated by AI.
              </small>
            </>
          ) : (
            <p>
              {b.audio_error ||
                (b.audio_status === "not_requested"
                  ? "Audio is optional. Generate it when you want to listen; saved audio is reused."
                  : "Narration is being prepared. Its status updates here automatically.")}
            </p>
          )}
        </div>
        {audio && (
          <select
            aria-label="Playback speed"
            value={speed}
            onChange={(e) => {
              const value = Number(e.target.value);
              setSpeed(value);
              if (player.current) player.current.playbackRate = value;
            }}
          >
            {[0.75, 1, 1.25, 1.5, 2].map((s) => (
              <option key={s} value={s}>
                {s}×
              </option>
            ))}
          </select>
        )}
        {["not_requested", "failed"].includes(b.audio_status) && (
          <button
            className="button"
            disabled={retryQueued}
            onClick={async () => {
              setRetryQueued(true);
              try {
                await api(`briefs/${b.id}/audio/generate`, {});
                onAudioRequested();
              } catch (e) {
                onError(e);
              } finally {
                setRetryQueued(false);
              }
            }}
          >
            {retryQueued
              ? "Requesting audio…"
              : b.audio_status === "not_requested"
                ? "Generate audio"
                : "Retry audio"}
          </button>
        )}
      </div>
      <div className="prose">
        {b.content.blocks.map((block, i) => (
          <section key={i}>
            <h2>{block.heading}</h2>
            {block.items.map((item, j) => (
              <div key={j}>
                <p>{item.text}</p>
                {item.change && (
                  <p className="change-note">What changed: {item.change}</p>
                )}
                <div className="inline-citations">
                  {item.citationIds.map((id) => {
                    const doc = b.citations.find((d) => d.id === id);
                    return doc && /^https?:\/\//i.test(doc.url) ? (
                      <a
                        key={id}
                        href={doc.url}
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        {doc.publisher} <ArrowUpRight size={12} />
                      </a>
                    ) : null;
                  })}
                </div>
              </div>
            ))}
          </section>
        ))}
        {b.content.limitations.length > 0 && (
          <section className="limitations">
            <h2>Scope & limitations</h2>
            {b.content.limitations.map((l, i) => (
              <p key={i}>{l}</p>
            ))}
          </section>
        )}
        <section className="references">
          <h2>Follow the sources</h2>
          {b.citations.map((d, i) => (
            <a
              href={/^https?:\/\//.test(d.url) ? d.url : "#"}
              key={d.id}
              target="_blank"
              rel="noreferrer noopener"
            >
              <span>{String(i + 1).padStart(2, "0")}</span>
              <div>
                {d.title}
                <small>
                  {d.publisher} ·{" "}
                  {d.origin === "discovered"
                    ? "Discovered source"
                    : "From your sources"}
                  {d.publishedAt
                    ? " · " + new Date(d.publishedAt).toLocaleDateString()
                    : ""}
                </small>
              </div>
              <ArrowUpRight size={16} />
            </a>
          ))}
        </section>
      </div>
      <details className="panel feedback">
        <summary>Was this useful? Leave private feedback</summary>
        <div className="rating">
          {[1, 2, 3, 4, 5].map((v) => (
            <button
              key={v}
              className={rating === v ? "selected" : ""}
              onClick={() => setRating(v)}
              aria-label={"Usefulness " + v + " of 5"}
            >
              {v}
            </button>
          ))}
        </div>
        <textarea
          aria-label="Review notes"
          maxLength={4000}
          placeholder="What helped? What was missing or inaccurate?"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />
        <button
          className="button"
          disabled={!rating || saved}
          onClick={async () => {
            try {
              await api(`briefs/${b.id}/review`, { score: rating, notes });
              setSaved(true);
            } catch (e) {
              onError(e);
            }
          }}
        >
          {saved ? "Review saved" : "Save private review"}
        </button>
      </details>
      {b.intent === "explore" && (
        <div className="handoff">
          <div>
            <h3>Want to follow this thread?</h3>
            <p>
              Start a topic draft. You’ll review sources and a schedule before
              anything recurs.
            </p>
          </div>
          <button className="button" onClick={() => void onConvert()}>
            Create recurring topic <ArrowRight size={16} />
          </button>
        </div>
      )}
    </article>
  );
}
