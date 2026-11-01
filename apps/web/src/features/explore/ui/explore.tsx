"use client";
import { useState, useRef } from "react";

import {
  ArrowRight,
  BookOpen,
  Headphones,
  CalendarDays,
  Check,
  LockKeyhole,
} from "lucide-react";

import { Run } from "@/features/generation/models";
import { OutputLimit } from "@/shared/contracts/output";
import {
  SourceList,
  type SourceInput,
} from "@/features/research/ui/source-list";

import { PageHeading } from "@/shared/ui/page-heading";
import { LimitPicker } from "@/shared/ui/limit-picker";
import type { Topic } from "@/features/topics/models";
import type { AccountSummary } from "@/features/account/models";
import { api } from "@/shared/http/client";
export function Explore({
  initial,
  capabilities,
  topics,
  onRun,
  onError,
}: {
  initial?: Run["snapshot"];
  capabilities: AccountSummary["capabilities"];
  topics: Topic[];
  onRun: (id: string) => void;
  onError: (e: unknown) => void;
}) {
  const [prompt, setPrompt] = useState(initial?.prompt || ""),
    [sourceRows, setSourceRows] = useState<SourceInput[]>(() => {
      const saved = initial?.sources as
        { url: string; scope: SourceInput["scope"] }[] | undefined;
      return saved?.length
        ? saved.map((source, index) => ({ ...source, id: `initial-${index}` }))
        : [{ id: "initial-0", url: "", scope: "page" }];
    }),
    [sourceMode, setSourceMode] = useState(
      String(initial?.sourceMode || "sources_only"),
    ),
    [sourceIds, setSourceIds] = useState<string[]>([]),
    [preferences, setPreferences] = useState(initial?.preferences || ""),
    [depth, setDepth] = useState(initial?.depth || "working"),
    [limit, setLimit] = useState<OutputLimit>(
      initial?.limit || { type: "words", value: 800 },
    ),
    [busy, setBusy] = useState(false),
    [conflict, setConflict] = useState(false);
  const key = useRef<string | null>(null);
  async function generate(resolved = false) {
    setBusy(true);
    try {
      const input = {
        prompt,
        sourceMode,
        sourceIds: sourceMode === "web_only" ? [] : sourceIds,
        sources:
          sourceMode === "web_only"
            ? []
            : sourceRows
                .filter((source) => source.url.trim())
                .map((source) => ({
                  url: source.url.trim(),
                  scope: source.scope,
                })),
        preferences,
        depth,
        limit,
        resolvedConflict: resolved,
      };
      const prepared = await api<{ conflict: boolean }>(
        "explorations/prepare",
        input,
      );
      if (prepared.conflict && !resolved) {
        setConflict(true);
        return;
      }
      key.current ??= crypto.randomUUID();
      const r = await api<{ runId: string }>(
        "explorations",
        input,
        "POST",
        key.current,
      );
      onRun(r.runId);
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="FOLLOW A QUESTION"
        title="What are you curious about?"
        text="A clear explanation, real sources, and room to go deeper. Audio is optional and generated only when you request it."
      />
      <div className="compose-layout">
        <form
          className="panel composer"
          onSubmit={(e) => {
            e.preventDefault();
            void generate();
          }}
          onChange={() => {
            key.current = null;
            setConflict(false);
          }}
        >
          <label className="large-label">
            Your question
            <textarea
              required
              maxLength={4000}
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="What makes instant payments different from a bank transfer?"
            />
          </label>
          <div className="form-grid">
            <label>
              Depth
              <select value={depth} onChange={(e) => setDepth(e.target.value)}>
                <option value="overview">Quick overview</option>
                <option value="working">Working knowledge</option>
                <option value="deep">Deep dive</option>
              </select>
            </label>
            <div>
              <span className="label-text">Make it fit your time</span>
              <LimitPicker value={limit} onChange={setLimit} />
            </div>
          </div>
          <div
            className="research-mode-tabs"
            role="tablist"
            aria-label="Research mode"
            onKeyDown={(event) => {
              if (
                !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
              )
                return;
              const tabs = Array.from(
                event.currentTarget.querySelectorAll<HTMLButtonElement>(
                  '[role="tab"]:not(:disabled)',
                ),
              );
              const current = tabs.indexOf(
                document.activeElement as HTMLButtonElement,
              );
              const next =
                event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? tabs.length - 1
                    : (current +
                        (event.key === "ArrowRight" ? 1 : -1) +
                        tabs.length) %
                      tabs.length;
              event.preventDefault();
              tabs[next]?.focus();
              tabs[next]?.click();
            }}
          >
            {[
              ["sources_only", "Use my sources only"],
              ["sources_and_web", "My sources + research"],
              ["web_only", "Search only"],
            ].map(([mode, label]) => (
              <button
                type="button"
                role="tab"
                key={mode}
                id={`research-mode-${mode}`}
                aria-selected={sourceMode === mode}
                aria-controls="research-mode-panel"
                tabIndex={sourceMode === mode ? 0 : -1}
                disabled={mode !== "sources_only" && !capabilities.search}
                onClick={() => {
                  setSourceMode(mode);
                  key.current = null;
                  setConflict(false);
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <div
            id="research-mode-panel"
            role="tabpanel"
            aria-labelledby={`research-mode-${sourceMode}`}
          >
            {sourceMode === "web_only" ? (
              <p className="source-mode-description">
                Search the web for your question. Your source list is excluded
                from this request.
              </p>
            ) : (
              <div className="source-editor">
                <p className="source-mode-description">
                  {sourceMode === "sources_only"
                    ? "Use only the sources below. Choose how each one should be read or searched."
                    : "Use the sources below and research the wider web for additional evidence."}
                </p>
                <SourceList
                  value={sourceRows}
                  searchAvailable={capabilities.search}
                  onChange={(next) => {
                    setSourceRows(next);
                    key.current = null;
                    setConflict(false);
                  }}
                />
                {topics.some((topic) =>
                  topic.config.sources.some(
                    (source) => source.status === "approved",
                  ),
                ) && (
                  <details className="saved-source-picker">
                    <summary>Choose saved sources</summary>
                    <label>
                      Saved sources (up to five)
                      <select
                        multiple
                        aria-label="Saved sources"
                        value={sourceIds}
                        onChange={(event) =>
                          setSourceIds(
                            Array.from(
                              event.target.selectedOptions,
                              (option) => option.value,
                            ),
                          )
                        }
                      >
                        {topics.flatMap((topic) =>
                          topic.config.sources
                            .filter(
                              (source) =>
                                source.status === "approved" && source.id,
                            )
                            .map((source) => (
                              <option key={source.id} value={source.id}>
                                {topic.name}: {source.name}
                              </option>
                            )),
                        )}
                      </select>
                    </label>
                  </details>
                )}
              </div>
            )}
          </div>
          <label>
            A little context <span className="muted">optional</span>
            <textarea
              value={preferences}
              maxLength={2000}
              rows={2}
              onChange={(e) => setPreferences(e.target.value)}
              placeholder="Your background, a perspective, or something to focus on."
            />
          </label>
          {conflict && (
            <div className="notice">
              Your question and selected limit differ. Use the control above?
              <button
                type="button"
                className="text-button"
                onClick={() => void generate(true)}
              >
                Use selected limit <Check size={15} />
              </button>
            </div>
          )}
          <div className="compose-footer">
            <span>
              <LockKeyhole size={13} /> Saved in your private history
            </span>
            <button
              className="button primary"
              disabled={busy || !prompt.trim()}
            >
              {busy ? "Preparing…" : "Make my brief"} <ArrowRight size={17} />
            </button>
          </div>
        </form>
        <aside className="reading-note">
          <span className="small-orbit">✳</span>
          <h3>Clarity over more content.</h3>
          <p>
            Your limit is a ceiling, not a target. A useful answer can be short.
          </p>
          <hr />
          <p>
            <BookOpen size={17} /> Text with linked evidence
          </p>
          <p>
            <Headphones size={17} /> Matching, verified narration
          </p>
          <p>
            <CalendarDays size={17} /> Saved for another day
          </p>
          <small>
            Free cloud AI may use submitted content to improve its products. Use
            public subjects and non-confidential context.
          </small>
        </aside>
      </div>
    </>
  );
}
