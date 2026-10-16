import Link from "next/link";
import type { ReactNode } from "react";
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
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-5xl flex-wrap items-end gap-x-6 gap-y-3 px-4 pb-0 pt-6 sm:px-8">
          <div className="flex flex-col gap-1 pb-4">
            <Link href="/" className="text-sm text-ink/60 hover:text-neel">PhirSe</Link>
            <h1 className="font-display text-4xl leading-none text-neel sm:text-5xl">{name}</h1>
          </div>
          <div className="ml-auto flex items-center gap-3 pb-4">
            <UiModeToggle mode={mode} nativeLabel="English" />
            {readOnly && (
              <Link href="/start" className="rounded-full bg-neel px-5 py-2.5 font-medium text-khadi">
                {t("startOwn")}
              </Link>
            )}
          </div>
          <nav className="flex w-full gap-6" aria-label="Practice profile">
            {tabs.map(([key, label, href]) => (
              <Link
                key={key}
                href={href}
                aria-current={tab === key ? "page" : undefined}
                className={`-mb-px border-b-2 pb-3 text-lg ${tab === key ? "border-haldi font-semibold text-neel" : "border-transparent text-ink/60 hover:text-neel"}`}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto flex max-w-5xl flex-col gap-12 px-4 py-8 sm:px-8">
        {readOnly && <p className="rounded-2xl bg-neel-soft px-5 py-3 text-neel">{t("readOnlyBanner")}</p>}
        {children}
      </main>
    </div>
  );
}

export function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
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
