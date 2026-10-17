import Link from "next/link";
import type { ReactNode } from "react";
import Brand from "@/components/Brand";
import UiModeToggle from "@/components/UiModeToggle";
import { F, pick, type UiMode } from "@/lib/i18n/dict";

type Tab = "practice" | "overview" | "words";

/** Frame for every dashboard page: name as the headline and the tabs of the one private link (practice, progress, words). */
export default function DashShell({
  token,
  name,
  mode,
  tab,
  readOnly = false,
  children,
}: {
  token: string;
  name: string;
  mode: UiMode;
  tab: Tab | null;
  readOnly?: boolean;
  children: ReactNode;
}) {
  const t = (k: keyof typeof F) => pick(F[k], mode);
  const base = `/p/${token}/dashboard`;
  const tabs: [Tab, string, string][] = [
    // The demo profile is read-only, so it has no practice tab.
    ...(readOnly ? [] : [["practice", t("practiceLink"), `/p/${token}`] as [Tab, string, string]]),
    ["overview", t("overview"), base],
    ["words", t("words"), `${base}/words`],
  ];
  return (
    <div className="min-h-dvh">
      <header className="bandhani text-khadi">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-4 px-4 pt-5 sm:px-8">
          <Brand tone="dark" />
          <div className="ml-auto flex items-center gap-3">
            <UiModeToggle mode={mode} nativeLabel="English" tone="dark" />
            {readOnly && (
              <Link href="/start" className="hidden rounded-full bg-haldi px-5 py-2.5 font-medium text-neel-deep sm:inline-block">
                {t("startOwn")}
              </Link>
            )}
          </div>
        </div>
        <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 pb-0 pt-10 sm:px-8">
          <h1 className="font-display text-5xl leading-none sm:text-6xl">{name}</h1>
          <nav className="flex gap-1 overflow-x-auto" aria-label="Practice profile">
            {tabs.map(([key, label, href]) => (
              <Link
                key={key}
                href={href}
                aria-current={tab === key ? "page" : undefined}
                className={`shrink-0 rounded-t-2xl px-5 py-3 text-lg transition-colors ${
                  tab === key ? "bg-khadi font-semibold text-neel" : "text-khadi/70 hover:bg-khadi/10 hover:text-khadi"
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto flex max-w-5xl flex-col gap-10 px-4 py-8 sm:px-8 sm:py-10">
        {readOnly && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl border border-neel/15 bg-neel-soft px-5 py-4 text-neel">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-haldi" aria-hidden />
            <p className="flex-1">{t("readOnlyBanner")}</p>
            <Link href="/start" className="rounded-full bg-neel px-4 py-2 text-sm font-medium text-khadi sm:hidden">
              {t("startOwn")}
            </Link>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}

export function Section({ title, hint, children, plain = false }: { title: string; hint?: string; children: ReactNode; plain?: boolean }) {
  return (
    <section className={`flex flex-col gap-5 ${plain ? "" : "panel p-5 sm:p-7"}`}>
      <div className="flex flex-col gap-1.5">
        <h2 className="text-2xl font-semibold text-neel">{title}</h2>
        {hint && <p className="max-w-[70ch] text-ink/65">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

export function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}
