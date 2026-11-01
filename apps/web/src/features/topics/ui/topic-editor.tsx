"use client";
import { useState, useEffect } from "react";

import {
  ArrowRight,
  Plus,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  Check,
  Sparkles,
  X,
} from "lucide-react";

import { TopicConfig, blockTypes } from "@/features/topics/models";

import {
  SourceScopeSelect,
  type SourceScope,
} from "@/features/research/ui/source-scope-select";

import { SubtopicSuggestions } from "@/features/topics/ui/subtopic-suggestions";
import { PageHeading } from "@/shared/ui/page-heading";
import { Empty } from "@/shared/ui/empty";
import { BriefCard } from "@/features/briefs/ui/brief-card";
import { LimitPicker } from "@/shared/ui/limit-picker";
import type { Topic } from "@/features/topics/models";
import type { AccountSummary } from "@/features/account/models";
import type { BriefRow } from "@/features/briefs/models";
import { api } from "@/shared/http/client";
import { defaultConfig } from "@/features/topics/defaults";
export function TopicEditor({
  topic,
  initial,
  origin,
  others,
  capabilities,
  onSaved,
  onError,
  onBrief,
  onRun,
}: {
  topic: Topic | null;
  initial?: TopicConfig;
  origin?: string;
  others: Topic[];
  capabilities: AccountSummary["capabilities"];
  onSaved: () => Promise<void>;
  onError: (e: unknown) => void;
  onBrief: (id: string) => Promise<void>;
  onRun: (id: string) => void;
}) {
  const [config, setConfig] = useState<TopicConfig>(
      topic?.config || initial || defaultConfig(),
    ),
    [tab, setTab] = useState(
      topic?.status === "active" ? "Latest" : "Settings",
    ),
    [busy, setBusy] = useState(false),
    [review, setReview] = useState(false),
    [sourceUrl, setSourceUrl] = useState(""),
    [sourceName, setSourceName] = useState(""),
    [manualScope, setManualScope] = useState(
      capabilities.search ? "search" : "feed",
    ),
    [discoveringSources, setDiscoveringSources] = useState(false),
    [sourceMessage, setSourceMessage] = useState(""),
    [runSourceMode, setRunSourceMode] = useState(
      config.researchPolicy === "approved_plus_discovery"
        ? "sources_and_web"
        : "sources_only",
    ),
    [note, setNote] = useState(""),
    [editingTemplate, setEditingTemplate] = useState(
      config.activeTemplateIndex,
    ),
    [history, setHistory] = useState<BriefRow[]>([]);
  useEffect(() => {
    if (topic)
      void api<{ items: BriefRow[] }>("briefs?topic=" + topic.id)
        .then((r) => setHistory(r.items))
        .catch(onError);
  }, [topic, onError]);
  const update = (patch: Partial<TopicConfig>) =>
    setConfig((c) => ({ ...c, ...patch }));
  const template = config.templates[editingTemplate] || config.templates[0];
  const updateTemplate = (patch: Partial<TopicConfig["templates"][number]>) =>
    update({
      templates: config.templates.map((t, i) =>
        i === editingTemplate ? { ...t, ...patch } : t,
      ),
    });
  async function save(activate = false) {
    setBusy(true);
    try {
      const r = await api<{ id: string }>(
        "topics" + (topic ? "/" + topic.id : ""),
        {
          config: {
            ...config,
            subtopics: config.subtopics
              .map((item) => item.trim())
              .filter(Boolean),
          },
          origin: origin ?? null,
        },
        topic ? "PATCH" : "POST",
      );
      if (activate)
        await api(
          `topics/${r.id}/${topic?.status === "paused" ? "resume" : "activate"}`,
          {},
        );
      await onSaved();
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  }
  async function addSource() {
    if (config.sources.length >= 10) {
      onError(new Error("A topic can have at most ten source candidates."));
      return;
    }
    try {
      const url = new URL(sourceUrl);
      const result = await api<{ url: string }>("sources/check", {
        url: url.href,
      });
      update({
        sources: [
          ...config.sources,
          {
            url: result.url,
            name: sourceName.trim() || url.hostname,
            scope: manualScope as "page" | "feed" | "site" | "search",
            status: "recommended",
            rationale:
              "Accessible public page. Expertise provenance unknown; approve explicitly after review.",
          },
        ],
      });
      setSourceUrl("");
      setSourceName("");
      setNote(
        "Source checked. Choose its scope and approve it before activation.",
      );
    } catch (e) {
      onError(e);
    }
  }
  return (
    <>
      <PageHeading
        eyebrow={topic ? "YOUR FOLLOWED TOPIC" : "START A NEW THREAD"}
        title={topic?.name || "What would you like to follow?"}
        text="Choose your focus, your sources, and your rhythm."
      />
      <div className="topic-tabs">
        {["Latest", "History", "Sources", "Templates", "Settings"].map((t) => (
          <button
            key={t}
            className={tab === t ? "selected" : ""}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      {(tab === "Latest" || tab === "History") && (
        <>
          <div className="actions topic-toolbar">
            {topic?.status !== "draft" && topic && (
              <>
                <label>
                  For this update
                  <select
                    aria-label="Update source mode"
                    value={runSourceMode}
                    onChange={(e) => setRunSourceMode(e.target.value)}
                  >
                    <option value="sources_only">My sources only</option>
                    <option value="web_only" disabled={!capabilities.search}>
                      Web only — ignore my sources
                    </option>
                    <option
                      value="sources_and_web"
                      disabled={!capabilities.search}
                    >
                      My sources + web
                    </option>
                  </select>
                </label>
                <button
                  className="button primary"
                  disabled={busy}
                  onClick={async () => {
                    try {
                      const r = await api<{ runId: string }>(
                        `topics/${topic.id}/updates`,
                        { sourceMode: runSourceMode },
                        "POST",
                        crypto.randomUUID(),
                      );
                      onRun(r.runId);
                    } catch (e) {
                      onError(e);
                    }
                  }}
                >
                  Generate an update <RefreshCw size={15} />
                </button>
                <button
                  className="button"
                  onClick={async () => {
                    try {
                      await api(
                        `topics/${topic.id}/${topic.status === "active" ? "pause" : "resume"}`,
                        {},
                      );
                      await onSaved();
                    } catch (e) {
                      onError(e);
                    }
                  }}
                >
                  {topic.status === "active"
                    ? "Pause future updates"
                    : "Resume schedule"}
                </button>
              </>
            )}
            <span className="muted">
              {topic?.status || "Draft"} · This run’s source choice does not
              change your saved schedule policy.
            </span>
          </div>
          {history.length ? (
            <div className="brief-grid">
              {(tab === "Latest" ? history.slice(0, 1) : history).map((b) => (
                <BriefCard
                  key={b.id}
                  brief={b}
                  onOpen={() => void onBrief(b.id)}
                />
              ))}
            </div>
          ) : (
            <Empty
              title="The next chapter is yours"
              text="Review and activate your topic, then deliberately generate the first update or wait for its schedule."
            />
          )}
        </>
      )}
      <form
        className="topic-editor-form"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        {tab === "Settings" && (
          <div className="panel topic-settings-panel">
            <section
              className="topic-form-section"
              aria-labelledby="topic-focus-heading"
            >
              <div className="topic-group-heading">
                <h2 id="topic-focus-heading">Topic focus</h2>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setTab("Sources")}
                >
                  <Plus size={15} />
                  Manage sources
                </button>
              </div>
              <div className="form-grid">
                <label>
                  Topic name
                  <input
                    required
                    maxLength={120}
                    value={config.name}
                    onChange={(e) => update({ name: e.target.value })}
                    placeholder="AI in the real world"
                  />
                </label>
                <label>
                  Learning goal
                  <input
                    required
                    maxLength={1000}
                    value={config.goal}
                    onChange={(e) => update({ goal: e.target.value })}
                    placeholder="Understand what changes for product teams"
                  />
                </label>
              </div>
              <div className="topic-context-grid">
                <label>
                  Your context and preferences
                  <textarea
                    rows={2}
                    maxLength={2000}
                    value={config.preferences}
                    onChange={(event) =>
                      update({ preferences: event.target.value })
                    }
                  />
                </label>
                <div className="topic-interest-field">
                  <SubtopicSuggestions
                    name={config.name}
                    goal={config.goal}
                    context={config.preferences}
                    existing={config.subtopics}
                    onRemove={(item) =>
                      setConfig((current) => ({
                        ...current,
                        subtopics: current.subtopics.filter(
                          (topic) => topic !== item,
                        ),
                      }))
                    }
                    request={(prompt, signal) =>
                      api(
                        "assist/subtopics",
                        { prompt },
                        "POST",
                        undefined,
                        signal,
                      )
                    }
                    onAdd={(items) =>
                      setConfig((current) => {
                        const combined = [...current.subtopics];
                        for (const item of items)
                          if (
                            combined.length < 20 &&
                            !combined.some(
                              (existing) =>
                                existing.trim().toLocaleLowerCase() ===
                                item.trim().toLocaleLowerCase(),
                            )
                          )
                            combined.push(item);
                        return { ...current, subtopics: combined };
                      })
                    }
                  />
                </div>
              </div>
            </section>
            <section
              className="topic-form-section"
              aria-labelledby="topic-delivery-heading"
            >
              <div className="topic-group-heading">
                <h2 id="topic-delivery-heading">Reading & delivery</h2>
              </div>
              <div className="form-grid topic-delivery-grid">
                <label>
                  Depth
                  <select
                    value={config.depth}
                    onChange={(e) =>
                      update({ depth: e.target.value as TopicConfig["depth"] })
                    }
                  >
                    <option value="overview">Quick overview</option>
                    <option value="working">Working knowledge</option>
                    <option value="deep">Deep dive</option>
                  </select>
                </label>
                <label>
                  Frequency
                  <select
                    value={config.schedule.cadence}
                    onChange={(e) =>
                      update({
                        schedule: {
                          ...config.schedule,
                          cadence: e.target.value as "daily" | "weekly",
                        },
                      })
                    }
                  >
                    <option value="weekly">Weekly</option>
                    <option value="daily">Daily</option>
                  </select>
                </label>
                {config.schedule.cadence === "weekly" && (
                  <label>
                    Day
                    <select
                      value={config.schedule.weekday}
                      onChange={(e) =>
                        update({
                          schedule: {
                            ...config.schedule,
                            weekday: Number(e.target.value),
                          },
                        })
                      }
                    >
                      {[
                        "Monday",
                        "Tuesday",
                        "Wednesday",
                        "Thursday",
                        "Friday",
                        "Saturday",
                        "Sunday",
                      ].map((d, i) => (
                        <option key={d} value={i + 1}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <label>
                  Local time
                  <input
                    type="time"
                    value={config.schedule.time}
                    onChange={(e) =>
                      update({
                        schedule: { ...config.schedule, time: e.target.value },
                      })
                    }
                  />
                </label>
                <label className="topic-timezone">
                  Timezone
                  <input
                    value={config.schedule.timezone}
                    onChange={(e) =>
                      update({
                        schedule: {
                          ...config.schedule,
                          timezone: e.target.value,
                        },
                      })
                    }
                  />
                </label>
              </div>
            </section>
          </div>
        )}
        {tab === "Sources" && (
          <div className="panel recurring-sources">
            <h2>Sources to follow</h2>
            <p className="source-intro">
              Follow a feed or search a publication for new material each brief.
              Enable the sources you want to use.
            </p>
            {capabilities.search && (
              <button
                type="button"
                className="button"
                disabled={discoveringSources}
                onClick={async () => {
                  if (!(config.name.trim() || config.goal.trim())) {
                    setSourceMessage(
                      "Add a topic name or learning goal in Settings first. Subtopics are optional.",
                    );
                    return;
                  }
                  if (config.sources.length >= 10) {
                    setSourceMessage(
                      "You have 10 sources. Remove one before requesting more suggestions.",
                    );
                    return;
                  }
                  setDiscoveringSources(true);
                  setSourceMessage("");
                  try {
                    const r = await api<{ sources: TopicConfig["sources"] }>(
                      "assist/sources",
                      {
                        prompt:
                          `Topic: ${config.name}\nGoal: ${config.goal}\nSubtopics: ${config.subtopics.join("; ")}\nContext: ${config.preferences}`.slice(
                            0,
                            4000,
                          ),
                      },
                    );
                    setConfig((current) => {
                      const urls = new Set(
                        current.sources.map((source) => source.url),
                      );
                      const added = r.sources.filter(
                        (source) => !urls.has(source.url),
                      );
                      return {
                        ...current,
                        sources: [...current.sources, ...added].slice(0, 10),
                      };
                    });
                    setSourceMessage(
                      r.sources.length
                        ? "Suggestions are ready. Enable the publications you want to follow."
                        : "No strong recurring sources found. Try a more specific topic or add a feed or publication below.",
                    );
                  } catch (error) {
                    setSourceMessage(
                      error instanceof Error
                        ? error.message
                        : "Could not discover sources. Please try again.",
                    );
                  } finally {
                    setDiscoveringSources(false);
                  }
                }}
              >
                <Sparkles size={15} />{" "}
                {discoveringSources
                  ? "Finding publications…"
                  : "Suggest recurring sources"}
              </button>
            )}
            <p className="source-prerequisite">
              {!(config.name.trim() || config.goal.trim()) ? (
                <>
                  Start by adding a topic in{" "}
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => {
                      setSourceMessage("");
                      setTab("Settings");
                    }}
                  >
                    Settings
                  </button>
                  . Subtopics are optional.
                </>
              ) : (
                <>
                  Suggestions use your topic and goal. Select subtopics in{" "}
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => {
                      setSourceMessage("");
                      setTab("Settings");
                    }}
                  >
                    Settings
                  </button>{" "}
                  for a closer match, or suggest sources now.
                </>
              )}
            </p>
            {sourceMessage && (
              <p className="source-discovery-message" role="status">
                {sourceMessage}
              </p>
            )}
            <details className="manual-source-entry">
              <summary>Add a source yourself</summary>
              <label>
                Source name (optional)
                <input
                  aria-label="New source name"
                  value={sourceName}
                  onChange={(e) => setSourceName(e.target.value)}
                />
              </label>
              <div className="source-type-field">
                <span>Source type</span>
                <SourceScopeSelect
                  label="New source scope"
                  value={manualScope as SourceScope}
                  searchAvailable={capabilities.search}
                  onChange={setManualScope}
                />
              </div>
              <div className="source-add">
                <input
                  aria-label="New source URL"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="https://publication.example/feed"
                />
                <button
                  type="button"
                  className="button"
                  onClick={() => void addSource()}
                >
                  <Plus size={15} /> Check and add source
                </button>
              </div>
            </details>
            <div className="recurring-source-list">
              {config.sources.map((s, i) => (
                <div className="source-row" key={s.id || i}>
                  <div>
                    <a
                      className="recurring-source-name"
                      href={s.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {s.name}
                    </a>
                    <small className="source-url" title={s.url}>
                      {s.url}
                    </small>
                    {s.rationale &&
                      !/expertise provenance unknown|review before|approve explicitly/i.test(
                        s.rationale,
                      ) && <p>{s.rationale}</p>}
                    {s.scope === "page" && (
                      <p className="source-static-note">
                        Reference page: rereads the same URL. Use a feed or site
                        search for new articles.
                      </p>
                    )}
                  </div>
                  <div className="source-controls">
                    <SourceScopeSelect
                      label={"Scope for " + s.name}
                      value={s.scope}
                      searchAvailable={capabilities.search}
                      onChange={(scope) =>
                        update({
                          sources: config.sources.map((source, index) =>
                            index === i ? { ...source, scope } : source,
                          ),
                        })
                      }
                    />
                    <label className="checkbox">
                      <input
                        type="checkbox"
                        checked={s.status === "approved"}
                        onChange={(e) =>
                          update({
                            sources: config.sources.map((v, j) =>
                              i === j
                                ? {
                                    ...v,
                                    status: e.target.checked
                                      ? "approved"
                                      : "disabled",
                                  }
                                : v,
                            ),
                          })
                        }
                      />{" "}
                      Use source
                    </label>
                    <button
                      type="button"
                      className="text-button danger"
                      onClick={() =>
                        update({
                          sources: config.sources.filter((_, j) => j !== i),
                        })
                      }
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <label className="checkbox policy">
              <input
                type="checkbox"
                checked={config.researchPolicy === "approved_plus_discovery"}
                onChange={(e) =>
                  update({
                    researchPolicy: e.target.checked
                      ? "approved_plus_discovery"
                      : "approved_only",
                  })
                }
              />{" "}
              Also allow broader public discovery
            </label>
            <p className="fine-print">
              Site search and broader discovery use search credits. Feeds, exact
              pages and linked pages do not.
            </p>
          </div>
        )}
        {tab === "Templates" && (
          <div className="panel">
            <div className="row">
              <h2>A brief that feels like yours</h2>
              <button
                type="button"
                className="button"
                onClick={() => {
                  const next = [
                    ...config.templates,
                    {
                      ...template,
                      id: undefined,
                      name: template.name + " copy",
                      blocks: [...template.blocks],
                    },
                  ];
                  update({ templates: next });
                  setEditingTemplate(next.length - 1);
                }}
              >
                <Plus size={15} /> Copy template
              </button>
            </div>
            <div className="template-tabs">
              {config.templates.map((t, i) => (
                <button
                  type="button"
                  key={t.id || i}
                  className={editingTemplate === i ? "pill selected" : "pill"}
                  onClick={() => setEditingTemplate(i)}
                >
                  {t.name}
                  {config.activeTemplateIndex === i ? " · active" : ""}
                </button>
              ))}
            </div>
            <div className="form-grid">
              <label>
                Template name
                <input
                  required
                  value={template.name}
                  onChange={(e) => updateTemplate({ name: e.target.value })}
                />
              </label>
              <label>
                Tone
                <input
                  maxLength={200}
                  value={template.tone}
                  onChange={(e) => updateTemplate({ tone: e.target.value })}
                />
              </label>
            </div>
            <LimitPicker
              value={template.limit}
              onChange={(limit) => updateTemplate({ limit })}
            />
            <h3>Content and order</h3>
            {template.blocks.map((b, i) => (
              <div className="block-row" key={b}>
                <span>{String(i + 1).padStart(2, "0")}</span>
                <strong>{b}</strong>
                <button
                  type="button"
                  aria-label={"Move " + b + " up"}
                  disabled={i === 0}
                  onClick={() => {
                    const blocks = [...template.blocks];
                    [blocks[i - 1], blocks[i]] = [blocks[i], blocks[i - 1]];
                    updateTemplate({ blocks });
                  }}
                >
                  <ChevronUp size={17} />
                </button>
                <button
                  type="button"
                  aria-label={"Move " + b + " down"}
                  disabled={i === template.blocks.length - 1}
                  onClick={() => {
                    const blocks = [...template.blocks];
                    [blocks[i + 1], blocks[i]] = [blocks[i], blocks[i + 1]];
                    updateTemplate({ blocks });
                  }}
                >
                  <ChevronDown size={17} />
                </button>
                <button
                  type="button"
                  aria-label={"Remove " + b}
                  onClick={() =>
                    updateTemplate({
                      blocks: template.blocks.filter((v) => v !== b),
                    })
                  }
                >
                  <X size={16} />
                </button>
              </div>
            ))}
            <label>
              Add a block
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value)
                    updateTemplate({
                      blocks: [
                        ...template.blocks,
                        e.target.value as (typeof blockTypes)[number],
                      ],
                    });
                }}
              >
                <option value="">Select a block…</option>
                {blockTypes
                  .filter((b) => !template.blocks.includes(b))
                  .map((b) => (
                    <option key={b}>{b}</option>
                  ))}
              </select>
            </label>
            <div className="actions">
              <button
                type="button"
                className="button"
                onClick={() => update({ activeTemplateIndex: editingTemplate })}
              >
                <Check size={15} /> Use for future updates
              </button>
              <select
                aria-label="Copy template to another topic"
                value=""
                onChange={async (e) => {
                  const target = others.find((t) => t.id === e.target.value);
                  if (!target) return;
                  try {
                    await api(
                      "topics/" + target.id,
                      {
                        config: {
                          ...target.config,
                          templates: [
                            ...target.config.templates,
                            { ...template, id: crypto.randomUUID() },
                          ],
                        },
                      },
                      "PATCH",
                    );
                    setNote(
                      "An independent copy was saved to " + target.name + ".",
                    );
                  } catch (err) {
                    onError(err);
                  }
                }}
              >
                <option value="">Copy to another topic…</option>
                {others
                  .filter((t) => t.id !== topic?.id)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
              </select>
            </div>
            <p className="fine-print">
              Inline evidence links stay available even if you remove the
              Sources block. Copies are independent. Changes affect future
              updates.
            </p>
          </div>
        )}
        {note && (
          <div className="notice" role="status">
            {note}
            <button
              type="button"
              onClick={() => setNote("")}
              aria-label="Dismiss note"
            >
              <X size={16} />
            </button>
          </div>
        )}
        {review && (
          <div className="panel review">
            <span className="eyebrow">ONE LAST LOOK</span>
            <h2>{config.name || "Your topic"}</h2>
            <p>{config.goal}</p>
            <dl>
              <dt>Focus</dt>
              <dd>{config.subtopics.join(", ") || "The whole topic"}</dd>
              <dt>Sources</dt>
              <dd>
                {config.sources
                  .filter((s) => s.status === "approved")
                  .map((s) => s.name)
                  .join(", ") || "Approve at least one accessible source first"}
              </dd>
              <dt>Research</dt>
              <dd>{config.researchPolicy.replaceAll("_", " ")}</dd>
              <dt>Template</dt>
              <dd>{config.templates[config.activeTemplateIndex]?.name}</dd>
              <dt>Schedule</dt>
              <dd>
                {config.schedule.cadence}, {config.schedule.time} ·{" "}
                {config.schedule.timezone}
              </dd>
            </dl>
            <p>
              Activation schedules future updates. It does not silently generate
              a first update.
            </p>
            <button
              type="button"
              className="button primary"
              disabled={busy}
              onClick={() => void save(true)}
            >
              {topic?.status === "paused"
                ? "Save and resume"
                : "Confirm and activate"}{" "}
              <ArrowRight size={16} />
            </button>
          </div>
        )}
        <div className="editor-footer">
          <button type="submit" className="button primary" disabled={busy}>
            {busy ? "Saving…" : topic ? "Save changes" : "Save draft"}
          </button>
          <button
            type="button"
            className="button"
            onClick={() => setReview((v) => !v)}
          >
            Review & {topic?.status === "paused" ? "resume" : "activate"}
          </button>
          <span className="fine-print">Saved history stays as it was.</span>
        </div>
      </form>
    </>
  );
}
