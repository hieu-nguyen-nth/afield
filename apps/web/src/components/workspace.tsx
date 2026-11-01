"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  Compass,
  BookOpen,
  Headphones,
  Plus,
  CalendarDays,
  Settings,
  RefreshCw,
  ArrowLeft,
  ChevronUp,
  ChevronDown,
  Check,
  LogOut,
  LockKeyhole,
  Sparkles,
  X,
  Leaf,
  Radio,
} from "lucide-react";
import type { Brief, Run, TopicConfig, OutputLimit } from "@/domain/contracts";
import { blockTypes } from "@/domain/contracts";
import { callbackMessage } from "@/infrastructure/auth/auth-feedback";
import { RunProgress } from "./run-progress";
import { SourceList, type SourceInput } from "./source-list";
import { SourceScopeSelect, type SourceScope } from "./source-scope-select";
import { SubtopicSuggestions } from "./subtopic-suggestions";

type Topic = {
  id: string;
  name: string;
  config: TopicConfig;
  status: string;
  pause_reason: string | null;
};
type Me = {
  user: { id: string; email: string };
  usage: {
    runs: number;
    limit: number;
    resetsAt?: string;
    dailyResetsAt?: string;
    shared?: boolean;
  };
  capabilities: {
    live: boolean;
    search: boolean;
    cloud: boolean;
    audio: boolean;
  };
};
type BriefRow = { summary?: string } & Pick<
  Brief,
  | "id"
  | "intent"
  | "topic_id"
  | "title"
  | "created_at"
  | "word_count"
  | "audio_status"
  | "budget_status"
  | "snapshot"
  | "partial"
>;
async function api<T>(
  path: string,
  body?: unknown,
  method = "POST",
  key?: string,
  signal?: AbortSignal,
): Promise<T> {
  const res = await fetch("/api/v1/" + path, {
    signal,
    method: body === undefined ? "GET" : method,
    headers:
      body === undefined
        ? {}
        : {
            "Content-Type": "application/json",
            ...(key ? { "Idempotency-Key": key } : {}),
          },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json();
  if (!res.ok)
    throw new Error(data.error?.message || "This request could not complete.");
  return data as T;
}
const dateLabel = (s: string) =>
  new Date(s).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
const defaultConfig = (): TopicConfig => ({
  name: "",
  goal: "",
  preferences: "",
  depth: "working",
  subtopics: [],
  researchPolicy: "approved_only",
  sources: [],
  templates: [
    {
      name: "My weekly brief",
      tone: "Clear, thoughtful, and practical",
      limit: { type: "words", value: 800 },
      blocks: [
        "Big picture",
        "Main developments",
        "Emerging signals",
        "What to watch",
        "Sources",
      ],
    },
  ],
  activeTemplateIndex: 0,
  schedule: {
    cadence: "weekly",
    weekday: 1,
    time: "08:00",
    timezone:
      Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Los_Angeles",
  },
});

export function Workspace() {
  const [me, setMe] = useState<Me | null>(null),
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
      const who = await api<Me>("me");
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
        const who = await api<Me>("me");
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

function Login({ onLogin }: { onLogin: () => Promise<void> }) {
  const [mode, setMode] = useState("login"),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [message, setMessage] = useState(() =>
      typeof window === "undefined"
        ? ""
        : callbackMessage(
            new URLSearchParams(window.location.search).get("auth-error"),
          ),
    ),
    [busy, setBusy] = useState(false);
  function changeMode(next: string) {
    setMode(next);
    setMessage("");
  }
  async function submit(action = mode) {
    setBusy(true);
    setMessage("");
    try {
      const r = await fetch("/api/auth/" + action, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          action === "google"
            ? {}
            : action === "reset"
              ? { email }
              : { email, password },
        ),
      });
      const data = await r.json();
      if (!r.ok)
        throw new Error(data.error?.message || "Sign-in could not complete.");
      if (data.url) {
        window.location.assign(data.url);
        return;
      }
      if (data.verify)
        setMessage("Check your email to verify your account, then sign in.");
      else if (action === "reset") setMessage(data.message);
      else await onLogin();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Sign-in is unavailable.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="welcome">
      <div className="welcome-copy">
        <div className="brand">
          <Leaf size={25} /> Afield
        </div>
        <span className="eyebrow">ROOM FOR CURIOSITY</span>
        <h1>
          A little more
          <br />
          understanding<span className="accent">.</span>
        </h1>
        <p>
          Explore the questions on your mind.
          <br />
          Keep up with the things that matter.
          <br />
          Read or listen, at your own pace.
        </p>
        <div className="welcome-flower" aria-hidden="true">
          ✳
        </div>
        <div className="pill">
          <LockKeyhole size={13} /> Private by design · Sources you can follow
        </div>
      </div>
      <div className="login-panel">
        <span className="eyebrow">YOUR PERSONAL READING ROOM</span>
        <h2>
          {mode === "signup"
            ? "Welcome, curious mind."
            : mode === "reset"
              ? "Find your way back."
              : "Good to have you here."}
        </h2>
        <p>
          {mode === "signup"
            ? "Create an account with an email approved by the app owner."
            : mode === "reset"
              ? "Enter your approved email and we’ll send a password recovery link."
              : "Sign in to explore, read, and return."}
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <label>
            Email address
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </label>
          {mode !== "reset" && (
            <label>
              Password
              <input
                type="password"
                required
                minLength={12}
                maxLength={128}
                autoComplete={
                  mode === "signup" ? "new-password" : "current-password"
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 12 characters"
              />
            </label>
          )}
          <button className="button primary full" disabled={busy}>
            {busy
              ? "One moment…"
              : mode === "signup"
                ? "Create account"
                : mode === "reset"
                  ? "Send recovery email"
                  : "Enter your reading room"}{" "}
            <ArrowRight size={17} />
          </button>
        </form>
        {mode !== "reset" && (
          <>
            <div className="divider">or</div>
            <button
              className="button full"
              disabled={busy}
              onClick={() => void submit("google")}
            >
              Continue with Google <ArrowUpRight size={16} />
            </button>
          </>
        )}
        {message && (
          <div className="notice" role="status">
            {message}
          </div>
        )}
        <div className="login-links">
          <button
            disabled={busy}
            onClick={() => changeMode(mode === "signup" ? "login" : "signup")}
          >
            {mode === "signup"
              ? "Already have an account? Sign in"
              : "Create personal account"}
          </button>
          <button
            disabled={busy}
            onClick={() => changeMode(mode === "reset" ? "login" : "reset")}
          >
            {mode === "reset" ? "Back to sign in" : "Forgot password?"}
          </button>
        </div>
        <p className="fine-print">
          Access is by invitation. Ask the app owner to approve your email
          before signing up. Your history and audio are never public.
        </p>
      </div>
    </div>
  );
}
function PageHeading({
  eyebrow,
  title,
  text,
  action,
}: {
  eyebrow: string;
  title: string;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{text}</p>
      </div>
      {action}
    </div>
  );
}
function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty">
      <span>✳</span>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
function BriefCard({
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
function LimitPicker({
  value,
  onChange,
}: {
  value: OutputLimit;
  onChange: (v: OutputLimit) => void;
}) {
  return (
    <div className="limit-picker">
      <div className="segmented">
        <button
          type="button"
          className={value.type === "words" ? "selected" : ""}
          onClick={() => onChange({ type: "words", value: 800 })}
        >
          Reading length
        </button>
        <button
          type="button"
          className={value.type === "duration" ? "selected" : ""}
          onClick={() => onChange({ type: "duration", value: 300 })}
        >
          Listening time
        </button>
      </div>
      {value.type === "words" ? (
        <select
          aria-label="Reading length"
          value={value.value}
          onChange={(e) =>
            onChange({
              type: "words",
              value: Number(e.target.value) as 400 | 800 | 1400,
            })
          }
        >
          <option value={400}>Short · up to 400 words</option>
          <option value={800}>Standard · up to 800 words</option>
          <option value={1400}>Extended · up to 1,400 words</option>
        </select>
      ) : (
        <label className="inline-label">
          <input
            aria-label="Listening minutes"
            type="number"
            min={1}
            max={15}
            value={value.value / 60}
            onChange={(e) =>
              onChange({ type: "duration", value: Number(e.target.value) * 60 })
            }
          />{" "}
          minutes, maximum at 1×
        </label>
      )}
    </div>
  );
}
function Explore({
  initial,
  capabilities,
  topics,
  onRun,
  onError,
}: {
  initial?: Run["snapshot"];
  capabilities: Me["capabilities"];
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

function TopicEditor({
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
  capabilities: Me["capabilities"];
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

function History({
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
function BriefView({
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
function SettingsView({
  onError,
  onDeleted,
}: {
  onError: (e: unknown) => void;
  onDeleted: () => void;
}) {
  const [password, setPassword] = useState(""),
    [message, setMessage] = useState("");
  return (
    <>
      <PageHeading
        eyebrow="A SPACE THAT BELONGS TO YOU"
        title="Settings & privacy"
        text="Your history, your sources, your control."
      />
      <div className="settings-grid">
        <div className="panel">
          <LockKeyhole size={24} />
          <h2>Private by default</h2>
          <p>
            Only your admitted account can retrieve its topics, evidence, saved
            briefs, and audio. Media access expires; saved content stays
            unchanged.
          </p>
          <p>
            AI research uses public sources. Free Gemini services may use
            submitted content to improve their products. Keep confidential work
            and personal documents out of requests.
          </p>
        </div>
        <div className="panel">
          <h2>Your saved data</h2>
          <p>
            Export includes your configuration, evidence, and briefs. Download
            selected audio from each brief separately to complete your backup.
          </p>
          <a className="button" href="/api/v1/export" download>
            Export my data <ArrowUpRight size={15} />
          </a>
          <hr />
          <h3>Update password</h3>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                const r = await fetch("/api/auth/password", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ password }),
                });
                const d = await r.json();
                if (!r.ok)
                  throw new Error(
                    d.error?.message || "Password update failed.",
                  );
                setPassword("");
                setMessage("Password updated.");
              } catch (err) {
                onError(err);
              }
            }}
          >
            <label>
              New password
              <input
                type="password"
                minLength={12}
                maxLength={128}
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <button className="button">Update password</button>
          </form>
          {message && <p role="status">{message}</p>}
          <hr />
          <h3>Delete this account</h3>
          <p>
            This immediately blocks access and future jobs, then queues removal
            of stored data and audio. Downloaded exports remain under your
            control.
          </p>
          <button
            className="text-button danger"
            onClick={async () => {
              const confirmation = window.prompt(
                "This removes your account and saved content. Type DELETE MY ACCOUNT to request deletion.",
              );
              if (confirmation !== "DELETE MY ACCOUNT") return;
              try {
                await api("account/delete", { confirmation });
                onDeleted();
              } catch (e) {
                onError(e);
              }
            }}
          >
            Request account deletion
          </button>
        </div>
      </div>
    </>
  );
}

function AccountView({
  me,
  runs,
  onOpenRun,
}: {
  me: Me;
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
