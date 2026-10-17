import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import DashShell, { Section, fmtDate } from "@/components/dashboard/DashShell";
import { F, pick } from "@/lib/i18n/dict";
import { uiMode } from "@/lib/i18n/server";
import { helpBySession, median, probeSeries, weeklyAdherence, wordStatus, type WordStatus } from "@/lib/engine/metrics";
import { loadOverview } from "@/lib/profile/dashboard";
import { claritySeries, recordingTips } from "@/lib/engine/clarity";
import { isReadOnly, profileFromToken, ProfileError } from "@/lib/profile/service";
import { DeleteZone, PracticeSwitch } from "./Controls";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Dashboard · PhirSe", robots: { index: false }, referrer: "no-referrer" };

// Help levels, from least to most help. Colours carry meaning: green = found alone, turmeric = with a hint.
const HELP_CELL = ["bg-mehendi", "bg-mehendi/55", "bg-haldi", "bg-haldi/45", "bg-line"];
const STATUS_STYLE: Record<WordStatus, string> = {
  easy: "bg-mehendi-soft text-mehendi",
  hint: "bg-haldi-soft text-ink",
  hard: "bg-paper text-ink ring-1 ring-neel/20",
  new: "bg-transparent text-ink/50 border border-dashed border-ink/20",
};
const STATUS_DOT: Record<WordStatus, string> = { easy: "bg-mehendi", hint: "bg-haldi", hard: "bg-neel", new: "bg-ink/25" };

export default async function Dashboard({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const profile = await profileFromToken(token).catch((e) => {
    if (e instanceof ProfileError && e.status === 401) notFound();
    throw e;
  });
  const mode = await uiMode();
  const readOnly = isReadOnly(profile);
  const t = (k: keyof typeof F) => pick(F[k], mode);
  const { sessions, words, attempts, alerts } = await loadOverview(profile.id);

  const week = weeklyAdherence(sessions);
  const order = [...sessions].reverse().map((s) => s.id);
  const help = helpBySession(attempts);
  const practised = words.filter((w) => w.set === "treated");
  const byStatus: Record<WordStatus, typeof practised> = { easy: [], hint: [], hard: [], new: [] };
  for (const w of practised) byStatus[wordStatus(help.get(w.id), order)].push(w);

  const wordSet = new Map(words.map((w) => [w.id, w.set]));
  const probes = probeSeries(
    attempts.map((a) => ({ ...a, word_set: a.word_item_id ? (wordSet.get(a.word_item_id) ?? null) : null })),
  );
  const latency = median(
    attempts.filter((a) => a.phase === "practice" && a.live_score === "correct" && a.latency_ms !== null).map((a) => a.latency_ms!),
  );
  const openAlert = alerts.find((a) => !a.acknowledged_at);
  const clarity = claritySeries(attempts, order).slice(-14);
  const tips = recordingTips(attempts.slice(-60));
  const sessionDate = new Map(sessions.map((s) => [s.id, s.started_at]));
  const recentSessions = sessions.slice(0, 12);
  const heatSessions = order.slice(-14);
  const name = `${profile.display_name} ${profile.honorific}`.trim();

  return (
    <DashShell token={token} name={name} mode={mode} tab="overview" readOnly={readOnly}>
      {openAlert ? (
        <section role="alert" className="flex flex-col gap-3 rounded-2xl border-l-8 border-sindoor bg-paper p-5 shadow-[var(--lift)]">
          <h2 className="text-xl font-semibold text-sindoor">{t("safetyAlert")}</h2>
          <p className="text-sm text-ink/60">{fmtDate(openAlert.created_at)}</p>
          <p className="max-w-[65ch] text-lg">{t("safetyAlertBody")}</p>
          <PracticeSwitch token={token} status="paused" mode={mode} label={t("allOk")} />
        </section>
      ) : profile.status === "paused" ? (
        <section className="flex flex-wrap items-center gap-4 rounded-2xl border-l-8 border-haldi bg-paper p-5 shadow-[var(--lift)]">
          <p className="text-lg text-neel">{t("paused")}</p>
          <PracticeSwitch token={token} status="paused" mode={mode} />
        </section>
      ) : null}

      <section aria-label={t("thisWeek")} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="panel flex flex-col gap-2 p-5 sm:p-6">
          <p className="text-ink/65">{t("thisWeek")}</p>
          <p className="wide text-5xl font-semibold leading-none pt-1 text-neel">
            {week.minutes}
            <span className="ml-2 text-xl font-normal text-ink/60">/ 50 {t("minutes")}</span>
          </p>
          <div className="mt-1 h-2 w-full rounded-full bg-neel-soft">
            <div className="h-2 rounded-full bg-haldi" style={{ width: `${Math.min(100, (week.minutes / 50) * 100)}%` }} />
          </div>
          <p className="text-sm text-ink/55">{week.sessions} {t(week.sessions === 1 ? "sessionOne" : "sessionsCount")}</p>
        </div>
        <div className="panel flex flex-col gap-2 p-5 sm:p-6">
          <p className="text-ink/65">{t("foundAlone")}</p>
          <p className="wide text-5xl font-semibold leading-none pt-1 text-mehendi">
            {byStatus.easy.length}
            <span className="ml-2 text-xl font-normal text-ink/60">/ {practised.length}</span>
          </p>
          <div className="mt-1 flex h-2 w-full overflow-hidden rounded-full bg-neel-soft" aria-hidden>
            <div className="bg-mehendi" style={{ width: `${practised.length ? (100 * byStatus.easy.length) / practised.length : 0}%` }} />
            <div className="bg-haldi" style={{ width: `${practised.length ? (100 * byStatus.hint.length) / practised.length : 0}%` }} />
          </div>
        </div>
        <div className="panel flex flex-col gap-2 p-5 sm:p-6">
          <p className="text-ink/65">{t("latency")}</p>
          <p className="wide text-5xl font-semibold leading-none pt-1 text-neel">
            {latency === null ? "–" : (latency / 1000).toFixed(1)}
            <span className="ml-2 text-xl font-normal text-ink/60">s</span>
          </p>
        </div>
      </section>

      <Section title={t("wordsTitle")} hint={t("wordsHint")}>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {(["easy", "hint", "hard", "new"] as WordStatus[]).map((s) => (
            <div key={s} className="flex flex-col gap-3 rounded-2xl bg-khadi p-4">
              <h3 className="flex items-center gap-2 font-medium text-ink/80">
                <span className={`h-2.5 w-2.5 rounded-full ${STATUS_DOT[s]}`} aria-hidden />
                {t(s === "easy" ? "wordsEasy" : s === "hint" ? "wordsHelp" : s === "hard" ? "wordsHard" : "wordsNew")}
                <span className="ml-auto rounded-full bg-paper px-2 text-sm text-ink/55">{byStatus[s].length}</span>
              </h3>
              <ul className="flex flex-wrap gap-2">
                {byStatus[s].map((w) => (
                  <li key={w.id} className={`rounded-full px-3.5 py-1 text-xl ${STATUS_STYLE[s]}`}>
                    {w.target_deva}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      <Section title={t("clarityTitle")} hint={t("clarityHint")}>
        {clarity.length === 0 ? (
          <p className="text-ink/60">{t("clarityPending")}</p>
        ) : (
          <div className="flex items-end gap-3 overflow-x-auto pb-1">
            {clarity.map((p) => (
              <div key={p.sessionId} className="flex shrink-0 flex-col items-center gap-1">
                <span className="wide text-sm font-semibold text-ink/80">{p.clarity}</span>
                <div className="flex h-32 w-8 items-end rounded-lg bg-haldi-soft/60">
                  <div className="w-8 rounded-lg bg-haldi" style={{ height: `${Math.max(3, p.clarity)}%` }} />
                </div>
                <span className="text-xs text-ink/55">{fmtDate(sessionDate.get(p.sessionId) ?? "").split(",")[0]}</span>
              </div>
            ))}
          </div>
        )}
        {tips.length > 0 && (
          <div className="flex flex-col gap-2 rounded-2xl border-l-4 border-haldi bg-haldi-soft/70 p-4">
            <h3 className="font-semibold text-ink">{t("tipsTitle")}</h3>
            <ul className="flex list-disc flex-col gap-1 pl-5 text-ink/85">
              {tips.map((tip) => (
                <li key={tip}>{t(`tip_${tip}` as keyof typeof F)}</li>
              ))}
            </ul>
          </div>
        )}
      </Section>

      <Section title={t("probeTitle")} hint={t("probeHint")}>
        {probes.length === 0 ? (
          <p className="text-ink/60">{t("noProbes")}</p>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex items-end gap-5 overflow-x-auto pb-1">
              {probes.map((p) => (
                <div key={p.sessionId} className="flex shrink-0 flex-col items-center gap-1">
                  <div className="flex h-36 items-end gap-1.5">
                    {[p.treated, p.untreated].map((b, i) => {
                      const pct = b.total ? Math.round((100 * b.correct) / b.total) : 0;
                      return (
                        <div key={i} className="flex w-7 flex-col items-center justify-end gap-1">
                          <span className="text-xs text-ink/60">{pct}%</span>
                          <div className={`w-7 rounded-md ${i === 0 ? "bg-neel" : "bg-neel/25"}`} style={{ height: `${Math.max(2, pct)}%` }} />
                        </div>
                      );
                    })}
                  </div>
                  <span className="text-xs text-ink/55">{fmtDate(p.date).split(",")[0]}</span>
                </div>
              ))}
            </div>
            <p className="flex gap-5 text-sm text-ink/65">
              <span><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-neel" />{t("practised")}</span>
              <span><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-neel/25" />{t("notPractised")}</span>
            </p>
          </div>
        )}
      </Section>

      {heatSessions.length > 0 && practised.length > 0 && (
        <Section title={t("cueTitle")}>
          <div className="overflow-x-auto">
            <table className="border-separate border-spacing-1">
              <tbody>
                {practised.map((w) => (
                  <tr key={w.id}>
                    <th scope="row" className="pr-3 text-left text-lg font-normal">{w.target_deva}</th>
                    {heatSessions.map((sid) => {
                      const rank = help.get(w.id)?.get(sid);
                      return (
                        <td key={sid}>
                          <div className={`h-6 w-6 rounded-md ${rank === undefined ? "bg-khadi" : HELP_CELL[rank]}`} />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink/65">
            {t("cueLegend").split(" · ").map((label, i) => (
              <span key={label} className="flex items-center gap-1.5">
                <span className={`inline-block h-3 w-3 rounded ${HELP_CELL[i]}`} />
                {label}
              </span>
            ))}
          </p>
        </Section>
      )}

      <Section title={t("sessionsTitle")}>
        {recentSessions.length === 0 ? (
          <p className="text-ink/60">
            {t("noSessions")}{" "}
            <Link href={`/p/${token}`} className="text-neel underline">{t("practiceLink")}</Link>
          </p>
        ) : (
          <ul className="-mx-2 flex flex-col">
            {recentSessions.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-x-6 gap-y-1 rounded-xl px-2 py-3 even:bg-khadi">
                <span className="w-40 font-medium">{fmtDate(s.started_at)}</span>
                <span className="w-24 text-ink/60">{s.minutes_active ? `${s.minutes_active.toFixed(1)} min` : "—"}</span>
                <span className={`w-32 ${s.end_reason === "safety" ? "font-semibold text-sindoor" : "text-ink/60"}`}>
                  {s.end_reason ?? t("open")}
                </span>
                <Link href={`/p/${token}/dashboard/sessions/${s.id}`} className="ml-auto rounded-full px-3 py-1 font-medium text-neel ring-1 ring-neel/20 hover:bg-neel hover:text-khadi">
                  {t("review")}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {!readOnly && profile.status === "active" && !openAlert && <PracticeSwitch token={token} status="active" mode={mode} />}

      <p className="max-w-[70ch] text-ink/65">{t("therapistNote")}</p>
      {!readOnly && <DeleteZone token={token} mode={mode} />}
    </DashShell>
  );
}
