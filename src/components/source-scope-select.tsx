"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, CircleHelp } from "lucide-react";

const modes = [
  {
    value: "search",
    label: "Search within this site",
    description:
      "Find matching public articles across this site each brief. Uses one search credit per run.",
  },
  {
    value: "feed",
    label: "RSS / Atom feed",
    description:
      "Read the feed’s latest entries and up to four linked articles. Enter a feed URL; no search credits needed.",
  },
  {
    value: "site",
    label: "Follow linked pages",
    description:
      "Read this URL and up to three relevant pages linked directly from it. No search credits needed.",
  },
  {
    value: "page",
    label: "This page only",
    description:
      "Reread this exact URL. Useful as a reference; it will not discover new articles.",
  },
] as const;
export type SourceScope = (typeof modes)[number]["value"];

export function SourceScopeSelect({
  value,
  onChange,
  label,
  searchAvailable,
}: {
  value: SourceScope;
  onChange: (value: SourceScope) => void;
  label: string;
  searchAvailable: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [help, setHelp] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const options = useRef(new Map<SourceScope, HTMLButtonElement>());
  const id = useId();
  const current = modes.find((mode) => mode.value === value)!;
  const enabled = modes.filter(
    (mode) => mode.value !== "search" || searchAvailable,
  );
  useEffect(() => {
    if (!open) return;
    options.current.get(value)?.focus();
    function outside(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open, value]);
  return (
    <div
      className="source-scope-select"
      ref={root}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node))
          setOpen(false);
      }}
    >
      <button
        ref={trigger}
        type="button"
        className="source-scope-trigger"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        {current.label}
        <ChevronDown size={14} aria-hidden="true" />
      </button>
      <div
        className="source-mode-help"
        onMouseEnter={() => setHelp(true)}
        onMouseLeave={() => setHelp(false)}
      >
        <button
          type="button"
          className="source-help-button"
          aria-label={`Explain ${current.label}`}
          aria-describedby={help ? `${id}-help` : undefined}
          onFocus={() => setHelp(true)}
          onBlur={() => setHelp(false)}
          onClick={() => setHelp(true)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setHelp(false);
          }}
        >
          <CircleHelp size={15} />
        </button>
        {help && (
          <div role="tooltip" id={`${id}-help`} className="source-mode-tooltip">
            {current.description}
          </div>
        )}
      </div>
      {open && (
        <div
          role="listbox"
          id={id}
          aria-label={label}
          className="source-scope-menu"
        >
          {modes.map((mode) => (
            <button
              key={mode.value}
              type="button"
              role="option"
              aria-selected={value === mode.value}
              disabled={mode.value === "search" && !searchAvailable}
              ref={(node) => {
                if (node) options.current.set(mode.value, node);
                else options.current.delete(mode.value);
              }}
              onClick={() => {
                onChange(mode.value);
                setOpen(false);
                trigger.current?.focus();
              }}
              onKeyDown={(event) => {
                const index = enabled.findIndex(
                  (item) => item.value === mode.value,
                );
                if (
                  ["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)
                ) {
                  event.preventDefault();
                  const next =
                    event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? enabled.length - 1
                        : (index +
                            (event.key === "ArrowDown" ? 1 : -1) +
                            enabled.length) %
                          enabled.length;
                  options.current.get(enabled[next].value)?.focus();
                } else if (event.key === "Escape") {
                  event.preventDefault();
                  setOpen(false);
                  trigger.current?.focus();
                }
              }}
            >
              <span className="source-mode-title">
                {mode.label}
                {value === mode.value && <Check size={14} aria-hidden="true" />}
              </span>
              <span className="source-mode-description">
                {mode.description}
                {mode.value === "search" && !searchAvailable
                  ? " Search is not connected."
                  : ""}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
