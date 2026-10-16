import Link from "next/link";
import { redirect } from "next/navigation";
import { currentSlp, slpDb } from "@/lib/db/server";
import { weeklyAdherence } from "@/lib/engine/metrics";
import Shell, { Card, fmtDate } from "./_components/Shell";

export const metadata = { title: "Patients · PhirSe" };
export const dynamic = "force-dynamic";

export default async function SlpHome() {
  const me = await currentSlp();
  if (!me) redirect("/slp/login");
  const db = await slpDb();
  const { data: patients } = await db
    .from("patient")
    .select("id, display_name, honorific, status, is_demo, created_at, session(started_at, minutes_active, end_reason), alert(id, kind, created_at, acknowledged_at), word_item(set, graduated_at)")
    .order("created_at", { ascending: false });

  const rows = (patients ?? []).map((p) => {
    const sessions = (p.session ?? []) as { started_at: string; minutes_active: number | null; end_reason: string | null }[];
    const week = weeklyAdherence(sessions);
    const last = sessions.map((s) => s.started_at).sort().at(-1) ?? null;
    const openAlerts = ((p.alert ?? []) as { acknowledged_at: string | null }[]).filter((a) => !a.acknowledged_at).length;
    const words = (p.word_item ?? []) as { set: string; graduated_at: string | null }[];
    return { ...p, week, last, openAlerts, treated: words.filter((w) => w.set === "treated").length, graduated: words.filter((w) => w.graduated_at).length };
  });
  const alertsTotal = rows.reduce((n, r) => n + r.openAlerts, 0);

  return (
    <Shell name={me.name}>
      <div className="flex flex-wrap items-end gap-3">
        <h1 className="text-2xl font-bold">Patients</h1>
        {alertsTotal > 0 && (
          <span className="rounded-full bg-alert px-3 py-1 text-sm font-medium text-white">{alertsTotal} open safety alert{alertsTotal > 1 ? "s" : ""}</span>
        )}
      </div>
      <Card>
        {rows.length === 0 ? (
          <p className="text-muted">No patients yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-muted">
                <tr>
                  <th className="py-2">Patient</th>
                  <th>This week</th>
                  <th>Minutes / 50</th>
                  <th>Last session</th>
                  <th>Words</th>
                  <th>Alerts</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-accent-soft">
                    <td className="py-3">
                      <Link href={`/slp/patients/${r.id}`} className="text-base font-medium hover:underline">
                        {r.display_name} {r.honorific}
                      </Link>
                      {r.is_demo && <span className="ml-2 rounded bg-accent-soft px-1.5 py-0.5 text-xs">demo</span>}
                      {r.status !== "active" && <span className="ml-2 text-xs text-muted">{r.status}</span>}
                    </td>
                    <td>{r.week.sessions} sessions ({r.week.completed} complete)</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 rounded-full bg-accent-soft">
                          <div className="h-2 rounded-full bg-calm" style={{ width: `${Math.min(100, (r.week.minutes / 50) * 100)}%` }} />
                        </div>
                        {r.week.minutes}
                      </div>
                    </td>
                    <td>{r.last ? fmtDate(r.last) : "—"}</td>
                    <td>{r.treated} treated · {r.graduated} graduated</td>
                    <td>{r.openAlerts > 0 ? <span className="font-semibold text-alert">{r.openAlerts}</span> : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </Shell>
  );
}
