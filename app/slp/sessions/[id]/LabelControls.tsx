"use client";

import { useState, useTransition } from "react";
import { labelAttempt } from "../../actions";

const ERROR_TYPES = [
  ["semantic", "Related word"],
  ["phonemic", "Sound error"],
  ["no_response", "No response"],
  ["unrelated", "Unrelated"],
  ["other", "Other"],
] as const;

export default function LabelControls({
  attemptId,
  label,
  errorType,
}: {
  attemptId: string;
  label: string | null;
  errorType: string | null;
}) {
  const [current, setCurrent] = useState(label);
  const [err, setErr] = useState(errorType);
  const [pending, start] = useTransition();

  const save = (l: string | null, e: string | null) => {
    setCurrent(l);
    setErr(e);
    start(() => labelAttempt(attemptId, l, e));
  };

  return (
    <div className="flex flex-col gap-2 text-sm">
      <span className="text-xs text-muted">Your label{pending ? " · saving…" : ""}</span>
      <div className="flex gap-2">
        <button
          onClick={() => save(current === "correct" ? null : "correct", null)}
          className={`rounded-full px-3 py-1.5 ${current === "correct" ? "bg-calm text-white" : "bg-calm/10 text-calm"}`}
        >
          Correct
        </button>
        <button
          onClick={() => save(current === "incorrect" ? null : "incorrect", err)}
          className={`rounded-full px-3 py-1.5 ${current === "incorrect" ? "bg-accent text-white" : "bg-accent-soft text-accent"}`}
        >
          Incorrect
        </button>
      </div>
      {current === "incorrect" && (
        <select
          value={err ?? ""}
          onChange={(e) => save("incorrect", e.target.value || null)}
          className="rounded-lg border border-accent-soft bg-white px-2 py-1"
        >
          <option value="">Error type…</option>
          {ERROR_TYPES.map(([v, t]) => (
            <option key={v} value={v}>{t}</option>
          ))}
        </select>
      )}
    </div>
  );
}
