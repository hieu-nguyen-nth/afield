"use client";
import { useEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
export type SourceInput = {
  id: string;
  url: string;
  scope: "page" | "search" | "feed" | "site";
};

export function SourceList({
  value,
  onChange,
  searchAvailable,
}: {
  value: SourceInput[];
  onChange: (next: SourceInput[]) => void;
  searchAvailable: boolean;
}) {
  const inputs = useRef(new Map<string, HTMLInputElement>());
  const [focusId, setFocusId] = useState<string | null>(null);
  useEffect(() => {
    if (focusId) inputs.current.get(focusId)?.focus();
  }, [focusId]);
  function update(id: string, change: Partial<SourceInput>) {
    onChange(
      value.map((source) =>
        source.id === id ? { ...source, ...change } : source,
      ),
    );
  }
  return (
    <div className="source-list">
      <div className="source-list-heading">
        <strong>Your sources</strong>
        <span>{value.length} / 5</span>
      </div>
      {value.length === 0 && (
        <p className="fine-print">
          Add a source below, or choose one of your saved sources.
        </p>
      )}
      <ol>
        {value.map((source, index) => (
          <li className="source-input-row" key={source.id}>
            <label className="source-input-url">
              Source {index + 1} URL
              <input
                ref={(node) => {
                  if (node) inputs.current.set(source.id, node);
                  else inputs.current.delete(source.id);
                }}
                type="url"
                maxLength={2000}
                aria-label={`Source ${index + 1} URL`}
                value={source.url}
                onChange={(event) =>
                  update(source.id, { url: event.target.value })
                }
                placeholder="https://example.com/article"
              />
            </label>
            <label className="source-input-method">
              Use this source to
              <select
                aria-label={`Source ${index + 1} reading method`}
                value={source.scope}
                onChange={(event) =>
                  update(source.id, {
                    scope: event.target.value as SourceInput["scope"],
                  })
                }
              >
                <option value="page">Read exact page</option>
                <option value="search" disabled={!searchAvailable}>
                  Search within site
                </option>
                <option value="feed">Read RSS / Atom feed</option>
                <option value="site">Follow linked pages</option>
              </select>
            </label>
            <button
              className="source-remove"
              type="button"
              aria-label={`Remove source ${index + 1}`}
              title="Remove source"
              onClick={() =>
                onChange(value.filter((item) => item.id !== source.id))
              }
            >
              <X size={16} />
            </button>
          </li>
        ))}
      </ol>
      <button
        className="text-button add-source"
        type="button"
        disabled={value.length >= 5}
        onClick={() => {
          const id = crypto.randomUUID();
          onChange([...value, { id, url: "", scope: "page" }]);
          setFocusId(id);
        }}
      >
        <Plus size={16} /> Add source
      </button>
      {value.some((source) => source.scope === "search") && (
        <p className="fine-print">
          Site search uses one search credit per source and reads up to five
          matching pages. Exact pages and feeds do not use search credits.
        </p>
      )}
    </div>
  );
}
