"use client";
import { useState } from "react";
import { Check, Plus, Sparkles } from "lucide-react";

type Result = { subtopics: string[]; reason: string };
const normalized = (text: string) => text.trim().toLocaleLowerCase();
export function SubtopicSuggestions({
  name,
  goal,
  context,
  existing,
  onAdd,
  onRemove,
  request,
}: {
  name: string;
  goal: string;
  context: string;
  existing: string[];
  onAdd: (items: string[]) => void;
  onRemove: (item: string) => void;
  request: (prompt: string, signal: AbortSignal) => Promise<Result>;
}) {
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [retained, setRetained] = useState<{
    focus: string;
    topics: string[];
  } | null>(null);
  const [result, setResult] = useState<(Result & { focus: string }) | null>(
    null,
  );
  const focus = JSON.stringify({
    name: name.trim(),
    goal: goal.trim(),
    context: context.trim(),
  });
  const canSuggest = !!(name.trim() || goal.trim());
  const current = result?.focus === focus ? result : null;
  const selected = new Set(existing.map(normalized));
  const suggested = new Set(current?.subtopics.map(normalized) ?? []);
  const candidates = [
    ...(retained?.focus === focus ? retained.topics : []),
    ...existing.filter((topic) => !suggested.has(normalized(topic))),
    ...(current?.subtopics ?? []),
  ];
  const seen = new Set<string>();
  const chips = candidates.filter((topic) => {
    const key = normalized(topic);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const duplicate = selected.has(normalized(draft));
  function addCustom() {
    if (!draft.trim() || duplicate || existing.length >= 20) return;
    setRetained({ focus, topics: [...chips, draft.trim()] });
    onAdd([draft.trim()]);
    setDraft("");
  }
  const remaining = Math.max(0, 20 - existing.length);
  async function suggest() {
    if (busy || !canSuggest) return;
    setBusy(true);
    setError("");
    try {
      const response = await request(
        `Topic: ${name.trim()}\nLearning goal: ${goal.trim()}\nContext: ${context.trim()}\nExisting interests: ${existing.join("; ")}`.slice(
          0,
          4000,
        ),
        AbortSignal.timeout(100000),
      );
      if (
        !Array.isArray(response.subtopics) ||
        !response.subtopics.length ||
        typeof response.reason !== "string"
      )
        throw new Error("No suggestions were returned. Please try again.");
      setResult({ ...response, focus });
      setRetained(null);
    } catch (err) {
      setError(
        err instanceof Error &&
          (err.name === "TimeoutError" || err.name === "AbortError")
          ? "Suggestions took too long. Please try again in a moment."
          : err instanceof Error
            ? err.message
            : "Suggestions could not load. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="subtopic-suggestions">
      <div className="subtopic-list-heading">
        <strong>
          Your subtopics{" "}
          <span className="subtopic-count">
            {existing.length} / 20 selected
          </span>
        </strong>
        <button
          type="button"
          className="text-button"
          disabled={busy || !canSuggest}
          onClick={() => void suggest()}
        >
          <Sparkles size={14} />
          {busy
            ? "Suggesting subtopics…"
            : result
              ? "Regenerate suggestions"
              : "Suggest subtopics"}
        </button>
      </div>
      {chips.length > 0 && (
        <div className="suggestion-results" aria-label="Subtopic choices">
          <ul>
            {chips.map((topic) => {
              const isSelected = selected.has(normalized(topic));
              return (
                <li key={normalized(topic)}>
                  <button
                    type="button"
                    className={`suggestion-chip${isSelected ? " is-selected" : ""}`}
                    aria-pressed={isSelected}
                    aria-label={topic}
                    disabled={!isSelected && !remaining}
                    onClick={() => {
                      setRetained({ focus, topics: chips });
                      if (isSelected) onRemove(topic);
                      else onAdd([topic]);
                    }}
                  >
                    {isSelected && <Check size={14} aria-hidden="true" />}
                    <span>{topic}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <div className="subtopic-custom-row">
        <input
          aria-label="New subtopic title"
          maxLength={100}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addCustom();
            }
          }}
          placeholder="Add your own subtopic…"
        />
        <button
          type="button"
          className="text-button"
          disabled={!draft.trim() || duplicate || !remaining}
          onClick={addCustom}
        >
          <Plus size={14} /> Add subtopic
        </button>
      </div>
      {duplicate && draft.trim() && (
        <p className="suggestion-help" role="status">
          This subtopic is already selected.
        </p>
      )}
      {!canSuggest && (
        <p className="suggestion-help">
          Enter a topic name or learning goal first.
        </p>
      )}
      {busy && (
        <p role="status" className="suggestion-help">
          Generating suggestions. Your current interests stay unchanged.
        </p>
      )}
      {error && (
        <div className="suggestion-error" role="alert">
          {error}
        </div>
      )}
      {!busy && result && !current && (
        <p className="suggestion-help">
          Your topic or context changed. Request new suggestions for the updated
          focus.
        </p>
      )}
      {current && (
        <details className="suggestion-rationale">
          <summary>Why these suggestions?</summary>
          <p>{current.reason}</p>
        </details>
      )}
      {!remaining && (
        <p className="suggestion-help">
          You have 20 interests. Deselect one before adding another.
        </p>
      )}
    </div>
  );
}
