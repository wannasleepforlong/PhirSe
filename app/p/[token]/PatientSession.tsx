"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSessionRunner, type RunnerStatus } from "@/hooks/useSessionRunner";
import { P, pick, type UiMode } from "@/lib/i18n/dict";
import { toHinglish } from "@/lib/i18n/hinglish";
import UiModeToggle from "@/components/UiModeToggle";
import Brand from "@/components/Brand";

const STATUS_KEY: Partial<Record<RunnerStatus, keyof typeof P>> = {
  preparing: "preparing",
  speaking: "speaking",
  listening: "listening",
  hearing: "hearing",
  thinking: "thinking",
  asking: "asking",
  paused: "paused",
};

const ERROR_TEXT = {
  mic: "micError",
  link: "linkError",
  paused: "pausedError",
  nowords: "noWordsError",
  network: "genericError",
} as const;

/** The one bold element: a turmeric circle that breathes while it listens. */
function Orb({ status }: { status: RunnerStatus }) {
  const listening = status === "listening";
  const hearing = status === "hearing";
  const dim = status === "thinking" || status === "preparing" || status === "paused";
  return (
    <div className="relative flex h-60 w-60 items-center justify-center sm:h-72 sm:w-72" aria-hidden>
      {(listening || hearing) && (
        <span className={`orb-halo absolute inset-6 rounded-full bg-haldi/40 ${hearing ? "[animation-duration:1.4s]" : ""}`} />
      )}
      <span
        className={`relative h-44 w-44 rounded-full bg-haldi transition-[opacity,transform] duration-700 sm:h-52 sm:w-52 ${
          listening ? "orb-breathe" : ""
        } ${hearing ? "scale-110" : ""} ${dim ? "opacity-45" : ""} ${status === "speaking" ? "ring-[14px] ring-khadi/15" : ""}`}
      />
    </div>
  );
}

function TopBar({ mode, onHelp, inSession }: { mode: UiMode; onHelp?: () => void; inSession: boolean }) {
  return (
    <div className="flex w-full max-w-2xl items-center gap-3">
      <Brand tone="dark" href={null} />
      <div className="ml-auto">
        <UiModeToggle mode={mode} nativeLabel="हिंदी" tone="dark" />
      </div>
      {inSession && onHelp && (
        <button onClick={onHelp} className="rounded-full bg-sindoor px-6 py-3 text-2xl font-semibold text-white">
          {pick(P.help, mode)}
        </button>
      )}
    </div>
  );
}

/** The same tabs as the dashboard, so one link covers practice, progress and words. Hidden during a session. */
function ProfileTabs({ token, mode }: { token: string; mode: UiMode }) {
  const tabs: [keyof typeof P, string][] = [
    ["tabPractice", `/p/${token}`],
    ["tabProgress", `/p/${token}/dashboard`],
    ["tabWords", `/p/${token}/dashboard/words`],
  ];
  return (
    <nav className="flex w-full max-w-2xl gap-1 rounded-full bg-khadi/10 p-1" aria-label="Practice profile">
      {tabs.map(([key, href], i) => (
        <Link
          key={key}
          href={href}
          aria-current={i === 0 ? "page" : undefined}
          className={`flex-1 rounded-full px-4 py-2 text-center text-lg transition-colors ${i === 0 ? "bg-khadi font-semibold text-neel" : "text-khadi/75 hover:bg-khadi/10 hover:text-khadi"}`}
        >
          {pick(P[key], mode)}
        </Link>
      ))}
    </nav>
  );
}

export default function PatientSession({
  token,
  mode,
  familyPhone,
}: {
  token: string;
  mode: UiMode;
  familyPhone: string | null;
}) {
  const r = useSessionRunner(token);
  const [captions, setCaptions] = useState(true);
  // The start button only works once React has hydrated; until then show it as not yet ready.
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const t = (k: keyof typeof P) => pick(P[k], mode);
  const caption = mode === "hinglish" ? toHinglish(r.caption) : r.caption;

  if (r.status === "safety") {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-sindoor px-4 py-10 text-white">
        <h1 className="max-w-lg text-center font-display text-5xl leading-tight">{t("safetyTitle")}</h1>
        <p className="max-w-lg text-center text-2xl leading-snug">{t("safetyBody")}</p>
        <div className="flex w-full max-w-sm flex-col gap-4">
          <a href="tel:112" className="wide rounded-2xl bg-white py-6 text-center text-3xl font-bold text-sindoor">{t("call112")}</a>
          <a href="tel:108" className="wide rounded-2xl border-2 border-white py-6 text-center text-3xl font-bold">{t("call108")}</a>
          {familyPhone && (
            <a href={`tel:${familyPhone.replace(/[^\d+]/g, "")}`} className="wide rounded-2xl border-2 border-white/70 py-5 text-center text-2xl font-semibold">
              {t("callFamily")}
            </a>
          )}
        </div>
        <p className="text-center text-lg">{t("safetyNotified")}</p>
      </main>
    );
  }

  if (r.status === "done") {
    return (
      <main className="flex min-h-dvh flex-col items-center gap-10 bandhani-faint px-4 py-6 text-khadi">
        <TopBar mode={mode} inSession={false} />
        <ProfileTabs token={token} mode={mode} />
        <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          <span className="h-28 w-28 rounded-full bg-mehendi ring-[18px] ring-mehendi/25" aria-hidden />
          <h1 className="font-display text-5xl leading-tight">{t("doneTitle")}</h1>
          <p className="text-2xl text-khadi/80">{t("doneBody")}</p>
        </div>
      </main>
    );
  }

  if (r.status === "idle" || r.status === "error") {
    return (
      <main className="flex min-h-dvh flex-col items-center gap-6 bandhani-faint px-4 py-6 text-khadi">
        <TopBar mode={mode} inSession={false} />
        <ProfileTabs token={token} mode={mode} />
        <div className="flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-8 text-center">
          <div className="flex flex-col gap-3">
            <h1 className="font-display text-5xl leading-[1.15] sm:text-6xl">{t("readyTitle")}</h1>
            <p className="mx-auto max-w-md text-xl leading-relaxed text-khadi/75">{t("aiNote")}</p>
          </div>
          {r.status === "error" && (
            <p role="alert" className="max-w-md rounded-2xl border-l-8 border-haldi bg-khadi px-5 py-4 text-left text-lg text-ink">
              {t(ERROR_TEXT[r.error ?? "network"])}
            </p>
          )}
          <button
            onClick={r.start}
            disabled={!ready}
            aria-busy={!ready}
            className="wide disabled:opacity-60 flex h-56 w-56 items-center justify-center rounded-full bg-haldi text-4xl font-bold text-neel-deep ring-[16px] ring-khadi/10 shadow-[0_0_80px_10px_rgb(233_168_27/0.25)] transition-transform hover:scale-[1.02] active:scale-95 sm:h-64 sm:w-64 sm:text-5xl"
          >
            {t("start")}
          </button>
        </div>
        <footer className="flex max-w-xl flex-col gap-1 text-center text-base leading-relaxed text-khadi/65">
          <p>{t("roomTip")}</p>
          <p>{t("notEmergency")}</p>
        </footer>
      </main>
    );
  }

  const a = r.action;
  const progress = a && a.progress.total > 0 ? a.progress.done / a.progress.total : 0;
  const statusKey = STATUS_KEY[r.status];
  const bigBtn = "wide flex-1 rounded-2xl py-6 text-3xl font-semibold transition-colors disabled:opacity-35";

  return (
    <main className="flex min-h-dvh flex-col items-center gap-4 bandhani-faint px-4 pb-6 pt-0 text-khadi">
      <div className="h-1.5 w-full max-w-2xl overflow-hidden rounded-b-full bg-khadi/10" aria-hidden>
        <div className="h-full bg-haldi transition-[width] duration-700" style={{ width: `${progress * 100}%` }} />
      </div>
      <TopBar mode={mode} onHelp={r.help} inSession />

      <div className="flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-5 text-center">
        {a?.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={a.imageUrl} alt="" className="max-h-52 rounded-3xl object-contain" />
        )}
        <Orb status={r.status} />
        <p className="min-h-8 text-2xl text-khadi/70" aria-live="polite">
          {statusKey ? t(statusKey) : ""}
        </p>
        {captions && caption && <p className="max-w-xl text-3xl font-medium leading-snug sm:text-4xl">{caption}</p>}
        <button onClick={() => setCaptions((c) => !c)} className="text-base text-khadi/60 underline underline-offset-4">
          {captions ? t("hideText") : t("showText")}
        </button>
      </div>

      <div className="flex w-full max-w-md gap-4">
        {r.status === "asking" ? (
          <>
            <button onClick={() => r.answer(true)} className={`${bigBtn} bg-khadi text-neel`}>{t("yes")}</button>
            <button onClick={() => r.answer(false)} className={`${bigBtn} border-2 border-khadi/70`}>{t("no")}</button>
          </>
        ) : r.status === "paused" || a?.phase === "PAUSED" ? (
          <>
            <button onClick={r.resume} className={`${bigBtn} bg-haldi text-neel-deep`}>{t("resume")}</button>
            <button onClick={r.stop} className={`${bigBtn} border-2 border-khadi/50 text-2xl`}>{t("stopToday")}</button>
          </>
        ) : (
          <>
            <button onClick={r.pause} disabled={r.status === "preparing"} className={`${bigBtn} border-2 border-khadi/50`}>
              {t("pause")}
            </button>
            <button onClick={r.skip} disabled={!a?.itemId || r.status === "thinking"} className={`${bigBtn} border-2 border-khadi/50`}>
              {t("skip")}
            </button>
          </>
        )}
      </div>
    </main>
  );
}
