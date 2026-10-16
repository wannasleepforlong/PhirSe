"use client";

import { useState, useTransition } from "react";
import { F, pick, type UiMode } from "@/lib/i18n/dict";
import { markAnswer } from "../../actions";

/** Optional: the family says what they heard. Toggling the same choice clears it. */
export default function MarkAnswer({
  token,
  attemptId,
  label,
  mode,
}: {
  token: string;
  attemptId: string;
  label: "correct" | "incorrect" | null;
  mode: UiMode;
}) {
  const [current, setCurrent] = useState(label);
  const [pending, start] = useTransition();
  const choose = (l: "correct" | "incorrect") => {
    const next = current === l ? null : l;
    setCurrent(next);
    start(() => markAnswer(token, attemptId, next));
  };
  return (
    <div className="flex flex-col gap-2 text-sm" aria-busy={pending}>
      <span className="text-ink/60">{pick(F.yourCheck, mode)}</span>
      <div className="flex gap-2">
        <button
          aria-pressed={current === "correct"}
          onClick={() => choose("correct")}
          className={`rounded-full px-3.5 py-2 ${current === "correct" ? "bg-mehendi text-white" : "border border-line"}`}
        >
          {pick(F.right, mode)}
        </button>
        <button
          aria-pressed={current === "incorrect"}
          onClick={() => choose("incorrect")}
          className={`rounded-full px-3.5 py-2 ${current === "incorrect" ? "bg-neel text-khadi" : "border border-line"}`}
        >
          {pick(F.notRight, mode)}
        </button>
      </div>
    </div>
  );
}
