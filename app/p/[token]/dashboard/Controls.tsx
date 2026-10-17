"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { F, pick, type UiMode } from "@/lib/i18n/dict";
import { deleteEverything, setPractice } from "./actions";

export function PracticeSwitch({ token, status, mode, label }: { token: string; status: string; mode: UiMode; label?: string }) {
  const [pending, start] = useTransition();
  const paused = status === "paused";
  return (
    <button
      disabled={pending}
      onClick={() => start(() => setPractice(token, paused ? "active" : "paused"))}
      className={`self-start rounded-full px-5 py-2.5 font-medium disabled:opacity-60 ${
        paused ? "bg-neel text-khadi" : "border border-line bg-paper text-ink/70 hover:border-neel/40 hover:text-neel"
      }`}
    >
      {label ?? pick(paused ? F.resume : F.pause, mode)}
    </button>
  );
}

export function DeleteZone({ token, mode }: { token: string; mode: UiMode }) {
  const t = (k: keyof typeof F) => pick(F[k], mode);
  const router = useRouter();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <details className="rounded-2xl border border-sindoor/20 px-5 py-4 text-ink/70 open:bg-paper">
      <summary className="cursor-pointer text-base">{t("dangerZone")}</summary>
      <div className="mt-4 flex max-w-xl flex-col gap-3">
        <p>{t("dangerBody")}</p>
        <label className="flex flex-col gap-1 text-sm">
          {t("deleteConfirm")}
          <input value={text} onChange={(e) => setText(e.target.value)} className="max-w-xs rounded-xl border border-line bg-paper px-3 py-2 text-base" />
        </label>
        {error && <p className="text-sindoor">{error}</p>}
        <button
          disabled={pending || text.trim().toUpperCase() !== "DELETE"}
          onClick={() =>
            start(async () => {
              const res = await deleteEverything(token, text);
              if (res.error) setError(res.error);
              else router.replace("/");
            })
          }
          className="self-start rounded-full bg-sindoor px-5 py-2.5 text-white disabled:opacity-40"
        >
          {t("deleteNow")}
        </button>
      </div>
    </details>
  );
}
