import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentSlp, slpDb } from "@/lib/db/server";
import { adminDb, AUDIO_BUCKET } from "@/lib/db/admin";
import { agreement } from "@/lib/engine/metrics";
import Shell, { Card, Stat, fmtDate, pct } from "../../_components/Shell";
import LabelControls from "./LabelControls";

export const dynamic = "force-dynamic";
export const metadata = { title: "Session review · PhirSe" };

const REASON_TEXT: Record<string, string> = {
  A_EXACT: "Unbiased pass heard the target",
  A_SELF_CORRECT: "Target heard after another word (self-correction)",
  A_CLOSE_B_EXACT: "Near-miss unbiased, target only when biased — likely sound error",
  B_ONLY: "Target heard only when the recogniser was pushed toward it",
  A_CLOSE: "Close but not exact — possible sound (phonemic) error",
  PASS_REQUEST: "Patient said they don't know",
  EMPTY_STT: "Speech heard, recogniser returned nothing",
  NO_SPEECH: "No speech",
  NO_MATCH: "Different word",
  WARMUP: "Warm-up (not scored)",
  NO_ITEM: "Not scored",
};

const SCORE_STYLE: Record<string, string> = {
  correct: "bg-calm/15 text-calm",
  uncertain: "bg-accent-soft text-accent",
  not_yet: "bg-background text-muted",
};

export default async function SessionReview({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ filter?: string }>;
}) {
  const { id } = await params;
  const { filter } = await searchParams;
  const me = await currentSlp();
  if (!me) redirect("/slp/login");
  const db = await slpDb();

  // RLS: only returns the session if it belongs to one of this SLP's patients.
  const { data: session } = await db
    .from("session")
    .select("id, patient_id, kind, started_at, end_reason, minutes_active, patient(display_name, honorific)")
    .eq("id", id)
    .maybeSingle();
  if (!session) notFound();

  const { data: rows } = await db
    .from("attempt")
    .select("id, word_item_id, phase, cue_level, audio_path, duration_ms, latency_ms, transcript_a, transcript_b, live_score, reason_code, self_corrected, stt_ms_a, stt_ms_b, verifier_status, verifier_score, slp_label, slp_error_type, created_at, word_item(target_deva, set)")
    .eq("session_id", id)
    .order("created_at");
  const attempts = rows ?? [];

  // Ownership is proven by the RLS query above; sign audio URLs server-side.
  const paths = attempts.map((a) => a.audio_path).filter((p): p is string => !!p);
  const signed = paths.length ? (await adminDb().storage.from(AUDIO_BUCKET).createSignedUrls(paths, 3600)).data ?? [] : [];
  const audioUrl = new Map(signed.map((s) => [s.path ?? "", s.signedUrl]));

  const shown = filter === "uncertain" ? attempts.filter((a) => a.live_score === "uncertain") : attempts;
  const agr = agreement(attempts as never);
  const patient = session.patient as unknown as { display_name: string; honorific: string } | null;
  const scored = attempts.filter((a) => a.phase !== "warmup");

  return (
    <Shell
      name={me.name}
      crumbs={[
        { href: `/slp/patients/${session.patient_id}`, label: patient?.display_name ?? "Patient" },
        { href: `/slp/sessions/${id}`, label: "Session" },
      ]}
    >
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Session review</h1>
        <span className="text-muted">{fmtDate(session.started_at)} · {session.kind} · {session.end_reason ?? "open"}</span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Attempts scored" value={scored.length} hint={`${scored.filter((a) => a.live_score === "uncertain").length} uncertain`} />
        <Stat label="Labelled by you" value={agr.labelled} hint="labels become the validation set" />
        <Stat label="Agreement" value={pct(agr.accuracy)} hint={`on ${agr.decided} decided attempts`} />
        <Stat label="Minutes" value={session.minutes_active ? session.minutes_active.toFixed(1) : "—"} />
      </div>

      <Card
        title="Attempts"
        right={
          <div className="flex gap-2 text-sm">
            <Link href={`/slp/sessions/${id}`} className={!filter ? "font-semibold underline" : "underline"}>All</Link>
            <Link href={`/slp/sessions/${id}?filter=uncertain`} className={filter === "uncertain" ? "font-semibold underline" : "underline"}>Uncertain only</Link>
          </div>
        }
      >
        <ol className="flex flex-col divide-y divide-accent-soft">
          {shown.map((a) => {
            const word = a.word_item as unknown as { target_deva: string; set: string } | null;
            return (
              <li key={a.id} className="grid gap-3 py-4 md:grid-cols-[1fr_1.6fr_auto]">
                <div>
                  <p className="text-xl font-medium">{word?.target_deva ?? (a.phase === "warmup" ? "warm-up" : "—")}</p>
                  <p className="text-xs text-muted">
                    {a.phase}{word ? ` · ${word.set}` : ""}{a.cue_level ? ` · cue: ${a.cue_level}` : ""}
                    {a.latency_ms !== null ? ` · ${(a.latency_ms / 1000).toFixed(1)} s to answer` : ""}
                  </p>
                  {a.audio_path && audioUrl.get(a.audio_path) && (
                    <audio controls preload="none" src={audioUrl.get(a.audio_path) ?? undefined} className="mt-2 h-9 w-full max-w-xs" />
                  )}
                </div>
                <div className="flex flex-col gap-1 text-sm">
                  <p><span className="text-muted">Pass A (unbiased):</span> <span className="text-base">{a.transcript_a || "—"}</span></p>
                  <p><span className="text-muted">Pass B (biased):</span> <span className="text-base">{a.transcript_b || "—"}</span></p>
                  <p className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${SCORE_STYLE[a.live_score]}`}>{a.live_score}</span>
                    <span className="text-xs text-muted">{REASON_TEXT[a.reason_code] ?? a.reason_code}</span>
                  </p>
                  <p className="text-xs text-muted">
                    Verifier: {a.verifier_status === "done" && a.verifier_score !== null ? a.verifier_score.toFixed(2) : a.verifier_status}
                    {a.stt_ms_a !== null ? ` · STT ${a.stt_ms_a}/${a.stt_ms_b ?? "–"} ms` : ""}
                  </p>
                </div>
                {a.phase !== "warmup" && word && (
                  <LabelControls attemptId={a.id} label={a.slp_label} errorType={a.slp_error_type} />
                )}
              </li>
            );
          })}
        </ol>
      </Card>
    </Shell>
  );
}
