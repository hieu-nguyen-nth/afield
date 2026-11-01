"use client";
import { useState, useEffect, useCallback } from "react";

import {
  ArrowUpRight,
  ArrowRight,
  Compass,
  BookOpen,
  Plus,
  CalendarDays,
  Settings,
  RefreshCw,
  LogOut,
  X,
  Leaf,
  Radio,
} from "lucide-react";

import { Brief } from "@/features/briefs/models";
import { Run } from "@/features/generation/models";
import { TopicConfig } from "@/features/topics/models";
import { RunProgress } from "@/features/generation/ui/run-progress";
import { Login } from "@/features/auth/ui/login";
import { PageHeading } from "@/shared/ui/page-heading";
import { Empty } from "@/shared/ui/empty";
import { BriefCard } from "@/features/briefs/ui/brief-card";
import { Explore } from "@/features/explore/ui/explore";
import { TopicEditor } from "@/features/topics/ui/topic-editor";
import { History } from "@/features/history/ui/history";
import { BriefView } from "@/features/briefs/ui/brief-view";
import { SettingsView } from "@/features/account/ui/settings-view";
import { AccountView } from "@/features/account/ui/account-view";
import type { Topic } from "@/features/topics/models";
import type { AccountSummary } from "@/features/account/models";
import type { BriefRow } from "@/features/briefs/models";
import { api } from "@/shared/http/client";
import { dateLabel } from "@/shared/format/date";
import { defaultConfig } from "@/features/topics/defaults";
export function Workspace() {
  const [me, setMe] = useState<AccountSummary | null>(null),
    [loading, setLoading] = useState(true),
    [view, setView] = useState("home"),
    [exploreInitial, setExploreInitial] = useState<
      Run["snapshot"] | undefined
    >(),
    [error, setError] = useState(""),
    [topics, setTopics] = useState<Topic[]>([]),
    [briefs, setBriefs] = useState<BriefRow[]>([]),
    [runs, setRuns] = useState<Run[]>([]),
    [selectedBrief, setSelectedBrief] = useState<Brief | null>(null),
    [runId, setRunId] = useState<string | null>(null),
    [watchVersion, setWatchVersion] = useState(0),
    [runLoadError, setRunLoadError] = useState(""),
    [run, setRun] = useState<Run | null>(null),
    [editing, setEditing] = useState<Topic | null>(null),
    [handoff, setHandoff] = useState<{
      config: TopicConfig;
      origin: string;
    } | null>(null);
  const report = useCallback(
    (e: unknown) =>
      setError(
        e instanceof Error ? e.message : "Something could not complete.",
      ),
    [],
  );
  const reload = useCallback(async () => {
    try {
      const who = await api<AccountSummary>("me");
      setMe(who);
      const [ts, bs, rs] = await Promise.all([
        api<Topic[]>("topics"),
        api<{ items: BriefRow[] }>("briefs"),
        api<Run[]>("runs"),
      ]);
      setTopics(ts);
      setBriefs(bs.items);
      setRuns(rs);
    } catch (e) {
      report(e);
    } finally {
      setLoading(false);
    }
  }, [report]);
  useEffect(() => {
    void (async () => {
      try {
        const who = await api<AccountSummary>("me");
        setMe(who);
        const [ts, bs, rs] = await Promise.all([
          api<Topic[]>("topics"),
          api<{ items: BriefRow[] }>("briefs"),
          api<Run[]>("runs"),
        ]);
        setTopics(ts);
        setBriefs(bs.items);
        setRuns(rs);
      } catch {
      } finally {
        setLoading(false);
      }
    })();
  }, []);
  const openBrief = useCallback(
    async (id: string) => {
      try {
        setSelectedBrief(await api<Brief>("briefs/" + id));
        setRunId(null);
        setView("brief");
      } catch (e) {
        report(e);
      }
    },
    [report],
  );
  const selectedBriefId = selectedBrief?.id,
    selectedAudioStatus = selectedBrief?.audio_status;
  useEffect(() => {
    if (
      !selectedBriefId ||
      !["pending", "processing"].includes(selectedAudioStatus || "")
    )
      return;
    let active = true;
    const id = selectedBriefId;
    const started = Date.now();
    const timer = setInterval(() => {
      if (document.hidden || Date.now() - started > 900000) return;
      void api<Brief>("briefs/" + id)
        .then((next) => {
          if (active) setSelectedBrief(next);
        })
        .catch(report);
    }, 10000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [selectedBriefId, selectedAudioStatus, report]);
  useEffect(() => {
    if (!runId) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const r = await api<Run>(
          "runs/" + runId,
          undefined,
          "GET",
          undefined,
          AbortSignal.timeout(20000),
        );
        if (!active) return;
        setRun(r);
        setRunLoadError("");
        if (r.brief_id) {
          await reload();
          await openBrief(r.brief_id);
          return;
        }
        if (["completed", "failed", "skipped"].includes(r.status)) {
          void reload();
          return;
        }
        timer = setTimeout(poll, document.hidden ? 15000 : 3000);
      } catch (e) {
        if (active)
          setRunLoadError(
            e instanceof Error
              ? e.message
              : "Could not load this request. Try checking its status again.",
          );
      }
    };
    void poll();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [runId, watchVersion, openBrief, reload]);
  const navigate = (next: string) => {
    if (["home", "account"].includes(next)) void reload();
    setError("");
    setView(next);
    setRunId(null);
    setSelectedBrief(null);
    setEditing(null);
    setHandoff(null);
  };
  const watch = (id: string) => {
    setRunId(id);
    setWatchVersion((version) => version + 1);
    setRun(null);
    setRunLoadError("");
    setView("run");
    setError("");
  };
  const saved = async () => {
    setEditing(null);
    setHandoff(null);
    setView("topics");
    await reload();
  };
  async function convert() {
    if (!selectedBrief) return;
    try {
      const pre = await api<{
        origin: string;
        prompt: string;
        preferences: string;
        sources: TopicConfig["sources"];
      }>("topics/from-exploration", { briefId: selectedBrief.id });
      setHandoff({
        origin: pre.origin,
        config: {
          ...defaultConfig(),
          name: pre.prompt,
          preferences: pre.preferences || "",
          sources: pre.sources.slice(0, 10),
        },
      });
      setEditing(null);
      setView("topic-edit");
    } catch (e) {
      report(e);
    }
  }
  if (loading)
    return (
      <div className="loading">
        <div className="brand">
          <Leaf size={25} /> Afield
        </div>
        <p>Opening your reading room…</p>
      </div>
    );
  if (!me) return <Login onLogin={reload} />;
  return (
    <div className="workspace">
      <aside className="sidebar">
        <button className="brand" onClick={() => navigate("home")}>
          <Leaf size={25} /> Afield<span className="brand-dot">●</span>
        </button>
        <span className="eyebrow nav-label">YOUR READING ROOM</span>
        <nav>
          {[
            ["home", "Overview", BookOpen],
            ["explore", "Explore", Compass],
            ["topics", "Stay updated", Radio],
            ["history", "History", CalendarDays],
          ].map(([id, label, Icon]) => {
            const I = Icon as typeof Compass;
            return (
              <button
                key={String(id)}
                className={view === id ? "nav-item active" : "nav-item"}
                onClick={() => navigate(String(id))}
              >
                <I size={19} />
                {String(label)}
                {id === "explore" && <span className="tiny">↗</span>}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-note">
          <div className="small-orbit">✳</div>
          <p>
            A little more understanding.
            <br />A little less noise.
          </p>
        </div>
        <div className="sidebar-bottom">
          <div className="account-row">
            <button className="account" onClick={() => navigate("account")}>
              <span className="avatar">{me.user.email[0].toUpperCase()}</span>
              <span>
                Personal account
                <small>
                  {me.usage.runs} / {me.usage.limit} shared slots
                </small>
              </span>
            </button>
            <button
              className="account-settings"
              aria-label="Settings & privacy"
              title="Settings & privacy"
              onClick={() => navigate("settings")}
            >
              <Settings size={18} />
            </button>
          </div>
          <button
            className="nav-item sign-out"
            onClick={async () => {
              try {
                const response = await fetch("/api/auth/logout", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: "{}",
                });
                if (!response.ok)
                  throw new Error(
                    "Sign-out could not complete. Please try again.",
                  );
                setRunId(null);
                setMe(null);
              } catch (e) {
                report(e);
              }
            }}
          >
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <span>Stay curious. Go a little deeper.</span>
          <span className="edition">
            PERSONAL EDITION <span className="status-dot" />
          </span>
        </header>
        {error && (
          <div className="notice error" role="alert">
            {error}
            <button aria-label="Dismiss error" onClick={() => setError("")}>
              <X size={16} />
            </button>
          </div>
        )}
        {view === "home" && (
          <>
            <div className="hero">
              <div>
                <span className="eyebrow">A GOOD DAY TO LEARN SOMETHING</span>
                <h1>
                  Make room
                  <br />
                  for curiosity<span className="accent">.</span>
                </h1>
                <p>
                  A question worth exploring. A topic worth following.
                  <br />
                  Useful understanding, in the time you have.
                </p>
              </div>
              <div className="hero-art" aria-hidden="true">
                <div className="orb orb-one" />
                <div className="orb orb-two" />
                <span>✳</span>
                <div className="art-caption">FOLLOW THE THREAD</div>
              </div>
            </div>
            <div className="mode-grid">
              <button
                className="mode-card explore-card"
                onClick={() => navigate("explore")}
              >
                <span className="card-icon">
                  <Compass size={25} />
                </span>
                <span className="eyebrow">WHEN CURIOSITY STRIKES</span>
                <h2>Explore a question</h2>
                <p>
                  Get a clear, source-backed explanation.
                  <br />
                  Read it. Listen to it. Keep it.
                </p>
                <span className="card-action">
                  Start exploring <ArrowRight size={18} />
                </span>
              </button>
              <button
                className="mode-card update-card"
                onClick={() => navigate("topics")}
              >
                <span className="card-icon">
                  <Radio size={25} />
                </span>
                <span className="eyebrow">FOR THE THINGS YOU FOLLOW</span>
                <h2>Stay meaningfully updated</h2>
                <p>
                  The developments that matter, without
                  <br />
                  the reading backlog.
                </p>
                <span className="card-action">
                  {topics.length ? "Your topics" : "Create your first topic"}{" "}
                  <ArrowRight size={18} />
                </span>
              </button>
            </div>
            <section>
              <div className="section-heading">
                <h2>Your latest reads</h2>
                <button
                  className="text-button"
                  onClick={() => navigate("history")}
                >
                  View history <ArrowUpRight size={16} />
                </button>
              </div>
              {briefs.length ? (
                <div className="brief-grid">
                  {briefs.slice(0, 4).map((b) => (
                    <BriefCard
                      key={b.id}
                      brief={b}
                      onOpen={() => void openBrief(b.id)}
                    />
                  ))}
                </div>
              ) : (
                <Empty
                  title="Your next discovery starts here"
                  text="Explore something on your mind, or follow a topic. Your saved text, audio, and sources will be waiting here."
                />
              )}
            </section>
            {runs.some((r) =>
              ["queued", "running", "failed"].includes(r.status),
            ) && (
              <section>
                <div className="section-heading">
                  <h2>In your workspace</h2>
                </div>
                {runs
                  .filter((r) =>
                    ["queued", "running", "failed"].includes(r.status),
                  )
                  .slice(0, 5)
                  .map((r) => (
                    <button
                      className="run-row"
                      key={r.id}
                      onClick={() => watch(r.id)}
                    >
                      <RefreshCw size={16} />
                      <span>
                        {r.intent === "explore"
                          ? "Exploration"
                          : "Topic update"}
                        <small>{dateLabel(r.created_at)}</small>
                      </span>
                      <span className="pill">
                        {r.stage.replaceAll("_", " ")}
                      </span>
                      <ArrowRight size={16} />
                    </button>
                  ))}
              </section>
            )}
          </>
        )}
        {view === "explore" && (
          <Explore
            initial={exploreInitial}
            capabilities={me.capabilities}
            topics={topics}
            onRun={watch}
            onError={report}
          />
        )}
        {view === "topics" && (
          <>
            <PageHeading
              eyebrow="FOLLOW WHAT MATTERS"
              title="Your topics"
              text="A thoughtful update, on your schedule."
              action={
                <button
                  className="button primary"
                  onClick={() => {
                    setEditing(null);
                    setView("topic-edit");
                  }}
                >
                  <Plus size={16} /> New topic
                </button>
              }
            />
            {topics.length ? (
              <div className="topic-grid">
                {topics.map((t) => (
                  <article key={t.id} className="topic-card">
                    <div className="row">
                      <span className="card-icon">
                        <Radio size={21} />
                      </span>
                      <span className="pill">{t.status}</span>
                    </div>
                    <h2>{t.name}</h2>
                    <p>{t.config.goal}</p>
                    <div className="topic-meta">
                      {t.config.schedule.cadence} ·{" "}
                      {
                        t.config.sources.filter((s) => s.status === "approved")
                          .length
                      }{" "}
                      approved sources
                    </div>
                    {t.pause_reason && (
                      <div className="notice">{t.pause_reason}</div>
                    )}
                    <div className="actions">
                      <button
                        className="button"
                        onClick={() => {
                          setEditing(t);
                          setView("topic-edit");
                        }}
                      >
                        Open topic
                      </button>
                      {t.status !== "draft" && (
                        <button
                          className="text-button"
                          onClick={async () => {
                            try {
                              const r = await api<{ runId: string }>(
                                `topics/${t.id}/updates`,
                                {},
                                "POST",
                                crypto.randomUUID(),
                              );
                              watch(r.runId);
                            } catch (e) {
                              report(e);
                            }
                          }}
                        >
                          Generate now <ArrowRight size={15} />
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <Empty
                title="Keep a thread going"
                text="Choose a subject, approve the sources you trust, and decide when you’d like an update."
              />
            )}
          </>
        )}
        {view === "topic-edit" && (
          <TopicEditor
            topic={editing}
            initial={handoff?.config}
            origin={handoff?.origin}
            others={topics}
            capabilities={me.capabilities}
            onSaved={saved}
            onError={report}
            onBrief={openBrief}
            onRun={watch}
          />
        )}
        {view === "history" && (
          <History topics={topics} onOpen={openBrief} onError={report} />
        )}
        {view === "run" && (
          <RunProgress
            run={run}
            loadError={runLoadError}
            onReload={() => runId && watch(runId)}
            onRetry={async () => {
              if (!run) return;
              try {
                await api(`runs/${run.id}/retry`, {});
                watch(run.id);
              } catch (e) {
                report(e);
              }
            }}
          />
        )}
        {view === "brief" && selectedBrief && (
          <BriefView
            brief={selectedBrief}
            onConvert={convert}
            onAudioRequested={() => void openBrief(selectedBrief.id)}
            onError={report}
            onBack={() => navigate("history")}
            onRevise={() => {
              setExploreInitial(selectedBrief.snapshot);
              navigate("explore");
            }}
          />
        )}
        {view === "settings" && (
          <SettingsView onError={report} onDeleted={() => setMe(null)} />
        )}
        {view === "account" && (
          <AccountView me={me} runs={runs} onOpenRun={watch} />
        )}
        <footer className="footer">
          <span>Made for the joy of understanding.</span>
          <span>
            <BookOpen size={14} /> Read. Listen. Return.
          </span>
        </footer>
      </main>
    </div>
  );
}
