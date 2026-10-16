import Link from "next/link";
import type { ReactNode } from "react";

export default function Shell({ name, children, crumbs = [] }: { name: string; children: ReactNode; crumbs?: { href: string; label: string }[] }) {
  return (
    <div className="min-h-screen font-[family-name:var(--font-inter)]">
      <header className="border-b border-accent-soft bg-surface">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-8">
          <Link href="/slp" className="font-bold text-accent">PhirSe</Link>
          <span className="text-sm text-muted">SLP dashboard</span>
          {crumbs.map((c) => (
            <span key={c.href} className="hidden text-sm text-muted sm:inline">
              / <Link href={c.href} className="hover:underline">{c.label}</Link>
            </span>
          ))}
          <span className="ml-auto truncate text-sm text-muted">{name}</span>
          <form action="/api/auth/signout" method="post">
            <button className="text-sm underline">Sign out</button>
          </form>
        </div>
      </header>
      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-8">{children}</main>
    </div>
  );
}

export function Card({ title, children, right }: { title?: string; children: ReactNode; right?: ReactNode }) {
  return (
    <section className="rounded-2xl bg-surface p-5 shadow-sm">
      {(title || right) && (
        <div className="mb-3 flex items-center gap-3">
          {title && <h2 className="text-lg font-semibold">{title}</h2>}
          <div className="ml-auto">{right}</div>
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-2xl bg-surface p-4 shadow-sm">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

export const pct = (x: number | null | undefined) => (x === null || x === undefined ? "–" : `${Math.round(x * 100)}%`);

export function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });
}
