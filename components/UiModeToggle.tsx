"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { UI_COOKIE, type UiMode } from "@/lib/i18n/dict";

/** Two-option switch between the native script and Hinglish. Stored in a cookie so server pages render in the same mode. */
export default function UiModeToggle({
  mode,
  nativeLabel,
  tone = "light",
}: {
  mode: UiMode;
  nativeLabel: string;
  tone?: "light" | "dark";
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const choose = (m: UiMode) => {
    if (m === mode) return;
    document.cookie = `${UI_COOKIE}=${m}; path=/; max-age=31536000; samesite=lax`;
    start(() => router.refresh());
  };
  const base = tone === "dark" ? "border-khadi/30 text-khadi" : "border-neel/25 text-neel";
  const on = tone === "dark" ? "bg-khadi text-neel" : "bg-neel text-khadi";
  return (
    <div role="radiogroup" aria-label="Language" className={`inline-flex rounded-full border p-0.5 text-sm ${base} ${pending ? "opacity-60" : ""}`}>
      {([["native", nativeLabel], ["hinglish", "Hinglish"]] as const).map(([m, label]) => (
        <button
          key={m}
          role="radio"
          aria-checked={mode === m}
          onClick={() => choose(m)}
          className={`rounded-full px-3 py-1 transition-colors ${mode === m ? on : ""}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
