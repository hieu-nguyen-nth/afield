"use client";
import { OutputLimit } from "@/shared/contracts/output";
export function LimitPicker({
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
