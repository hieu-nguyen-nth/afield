"use client";
import { useState } from "react";
import { ArrowUpRight, ArrowRight, LockKeyhole, Leaf } from "lucide-react";

import { callbackMessage } from "@/features/auth/feedback";
export function Login({ onLogin }: { onLogin: () => Promise<void> }) {
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
