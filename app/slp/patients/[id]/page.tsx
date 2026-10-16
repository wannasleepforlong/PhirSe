import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentSlp, slpDb } from "@/lib/db/server";
import { agreement, median, probeSeries, weeklyAdherence, type AttemptLike } from "@/lib/engine/metrics";
import Shell, { Card, Stat, fmtDate, pct } from "../../_components/Shell";
import { AckAlertButton, StatusToggle } from "./PatientControls";

export const dynamic = "force-dynamic";
export const metadata = { title: "Patient · PhirSe" };

const CUE_RANK: Record<string, number> = { prompt: 0, semantic: 1, phonemic: 2, model: 3 };
const CUE_COLORS = ["bg-calm", "bg-calm/60", "bg-accent/60", "bg-accent", "bg-accent-soft"];

interface AttemptRow extends AttemptLike {
  id: string;
  session_id: string;
  word_item_id: string | null;
  cue_level: string | null;
  created_at: string;
  latency_ms: number | null;
}

export default async function PatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await currentSlp();
  if (!me) redirect("/slp/login");
  const db = await slpDb();

  const { data: patient } = await db
    .from("patient")
    .select("id, display_name, honorific, status, is_demo, settings")
    .eq("id", id)
    .maybeSingle();
  if (!patient) notFound();

  const [{ data: sessions }, { data: words }, { data: alerts }] = await Promise.all([
    db.from("session").select("id, kind, started_at, ended_at, end_reason, minutes_active").eq("patient_id", id).order("started_at", { ascending: false }).limit(60),
    db.from("word_item").select("id, target_deva, set, leitner_box, independent_streak, graduated_at, approved_at").eq("patient_id", id).order("set").order("target_deva"),
    db.from("alert").select("id, kind, details, created_at, acknowledged_at").eq("patient_id", id).order("created_at", { ascending: false }).limit(20),
  ]);
  const sessionIds = (sessions ?? []).map((s) => s.id);
  const { data: attemptsRaw } = sessionIds.length
    ? await db
        .from("attempt")
        .select("id, session_id, word_item_id, phase, cue_level, live_score, slp_label, latency_ms, created_at")
        .in("session_id", sessionIds)
        .order("created_at")
    : { data: [] };

  const wordSet = new Map((words ?? []).map((w) => [w.id, w.set]));
  const attempts = ((attemptsRaw ?? []) as AttemptRow[]).map((a) => ({ ...a, word_set: a.word_item_id ? wordSet.get(a.word_item_id) : null }));
  const agr = agreement(attempts);
  const probes = probeSeries(attempts);
  const week = weeklyAdherence(sessions ?? []);
  const latency = median(attempts.filter((a) => a.phase === "practice" && a.live_score === "correct" && a.latency_ms !== null).map((a) => a.latency_ms!));

  // Cue heatmap: per treated word, the lowest cue at which it was said correctly in each session.
  const orderedSessions = [...(sessions ?? [])].reverse().slice(-12);
  const heat = new Map<string, Map<string, number>>();
  for (const a of attempts) {
    if (a.phase !== "practice" || !a.word_item_id || !a.cue_level) continue;
    const row = heat.get(a.word_item_id) ?? new Map<string, number>();
    const rank = a.live_score === "correct" ? CUE_RANK[a.cue_level] : 4;
    row.set(a.session_id, Math.min(row.get(a.session_id) ?? 4, rank));
    heat.set(a.word_item_id, row);
  }
  const treated = (words ?? []).filter((w) => w.set === "treated");
  const openAlerts = (alerts ?? []).filter((a) => !a.acknowledged_at);

  return (
    <Shell name={me.name} crumbs={[{ href: `/slp/patients/${id}`, label: patient.display_name }]}>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">{patient.display_name} {patient.honorific}</h1>
        {patient.is_demo && <span className="rounded bg-accent-soft px-2 py-0.5 text-xs">demo · simulated data</span>}
        <StatusToggle patientId={id} status={patient.status} />
        <Link href={`/slp/patients/${id}/words`} className="ml-auto rounded-full bg-accent px-4 py-2 text-sm text-white">Edit words</Link>
      </div>

      {openAlerts.length > 0 && (
        <section className="rounded-2xl border-2 border-alert bg-alert/5 p-4">
          <h2 className="font-semibold text-alert">Open safety alerts</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {openAlerts.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-3 text-sm">
                <span className="font-medium">{a.kind}</span>
                <span className="text-muted">{fmtDate(a.created_at)}</span>
                {(a.details as { phrase?: string })?.phrase && <span>“{(a.details as { phrase?: string }).phrase}”</span>}
                <AckAlertButton alertId={a.id} patientId={id} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Practice this week" value={`${week.minutes} min`} hint={`${week.sessions} sessions · target 50 min`} />
        <Stat label="Agent vs your labels" value={pct(agr.accuracy)} hint={`${agr.decided} labelled · kappa ${agr.kappa === null ? "–" : agr.kappa.toFixed(2)}`} />
        <Stat label="False accepts" value={agr.falseAccepts} hint="agent correct, you said incorrect" />
        <Stat label="Median answer latency" value={latency === null ? "–" : `${(latency / 1000).toFixed(1)} s`} hint="correct practice answers" />
      </div>

      <Card title="Probe accuracy — practised vs not practised">
        {probes.length === 0 ? (
          <p className="text-sm text-muted">No probe sessions yet.</p>
        ) : (
          <div className="flex items-end gap-4 overflow-x-auto pb-2">
            {probes.map((p) => (
              <div key={p.sessionId} className="flex flex-col items-center gap-1 text-xs">
                <div className="flex h-32 items-end gap-1">
                  {[p.treated, p.untreated].map((b, i) => (
                    <div key={i} className="flex w-6 flex-col items-center justify-end">
                      <span className="mb-1">{b.total ? Math.round((100 * b.correct) / b.total) : 0}</span>
                      <div className={`w-6 rounded-t ${i === 0 ? "bg-calm" : "bg-accent-soft"}`} style={{ height: `${b.total ? (100 * b.correct) / b.total : 0}%`, minHeight: 2 }} />
                    </div>
                  ))}
                </div>
                <span className="text-muted">{fmtDate(p.date).split(",")[0]}</span>
              </div>
            ))}
            <div className="ml-4 flex flex-col gap-1 text-xs">
              <span><span className="mr-1 inline-block h-2 w-2 bg-calm" />practised (treated)</span>
              <span><span className="mr-1 inline-block h-2 w-2 bg-accent-soft" />not practised (untreated)</span>
            </div>
          </div>
        )}
      </Card>

      <Card title="Cue needed per word">
        <p className="mb-3 text-xs text-muted">Each cell is one session. Darker green = needed less help. Words get easier before they are independent.</p>
        <div className="overflow-x-auto">
          <table className="text-sm">
            <tbody>
              {treated.map((w) => (
                <tr key={w.id}>
                  <td className="pr-3 text-base">{w.target_deva}</td>
                  {orderedSessions.map((s) => {
                    const rank = heat.get(w.id)?.get(s.id);
                    return (
                      <td key={s.id} className="p-0.5">
                        <div
                          title={rank === undefined ? "not practised" : ["no cue", "meaning cue", "first sound", "model", "not said"][rank]}
                          className={`h-5 w-5 rounded ${rank === undefined ? "bg-background" : CUE_COLORS[rank]}`}
                        />
                      </td>
                    );
                  })}
                  <td className="pl-3 text-xs text-muted">box {w.leitner_box}{w.graduated_at ? " · graduated" : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Sessions">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="text-muted">
              <tr><th className="py-2">Started</th><th>Kind</th><th>Minutes</th><th>Ended</th><th></th></tr>
            </thead>
            <tbody>
              {(sessions ?? []).map((s) => (
                <tr key={s.id} className="border-t border-accent-soft">
                  <td className="py-2">{fmtDate(s.started_at)}</td>
                  <td>{s.kind}</td>
                  <td>{s.minutes_active ? s.minutes_active.toFixed(1) : "—"}</td>
                  <td className={s.end_reason === "safety" ? "font-semibold text-alert" : ""}>{s.end_reason ?? (s.ended_at ? "" : "open")}</td>
                  <td><Link className="underline" href={`/slp/sessions/${s.id}`}>Review</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </Shell>
  );
}
