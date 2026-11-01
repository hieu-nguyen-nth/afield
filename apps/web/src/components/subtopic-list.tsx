"use client";
import { useState } from "react";
import { Plus, X } from "lucide-react";

export function SubtopicList({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const exists = value.some(
    (item) =>
      item.trim().toLocaleLowerCase() === draft.trim().toLocaleLowerCase(),
  );
  function add() {
    if (!draft.trim() || exists || value.length >= 20) return;
    onChange([...value, draft.trim()]);
    setDraft("");
  }
  return (
    <div className="subtopic-list">
      <div className="subtopic-list-heading">
        <strong>Your subtopics</strong>
        <span>{value.length} / 20</span>
      </div>
      <ol>
        {value.map((topic, index) => (
          <li key={index}>
            <span className="subtopic-number" aria-hidden="true">
              {index + 1}
            </span>
            <input
              aria-label={`Subtopic ${index + 1} title`}
              maxLength={100}
              value={topic}
              onChange={(event) =>
                onChange(
                  value.map((item, i) =>
                    i === index ? event.target.value : item,
                  ),
                )
              }
            />
            <button
              type="button"
              className="source-remove"
              aria-label={`Remove subtopic ${index + 1}`}
              onClick={() => onChange(value.filter((_, i) => i !== index))}
            >
              <X size={15} />
            </button>
          </li>
        ))}
      </ol>
      <div className="subtopic-add-row">
        <input
          aria-label="New subtopic title"
          maxLength={100}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              add();
            }
          }}
          placeholder="Add your own subtopic…"
        />
        <button
          type="button"
          className="text-button"
          disabled={!draft.trim() || exists || value.length >= 20}
          onClick={add}
        >
          <Plus size={14} /> Add subtopic
        </button>
      </div>
      {exists && draft.trim() && (
        <p className="suggestion-help" role="status">
          This subtopic is already in your list.
        </p>
      )}
    </div>
  );
}
