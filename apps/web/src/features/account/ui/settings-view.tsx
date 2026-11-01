"use client";
import { useState } from "react";
import { ArrowUpRight, LockKeyhole } from "lucide-react";

import { PageHeading } from "@/shared/ui/page-heading";
import { api } from "@/shared/http/client";
export function SettingsView({
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
