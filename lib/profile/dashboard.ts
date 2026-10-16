// Read models for the family dashboard. Server only; every query is scoped to one profile id.

import "server-only";
import { adminDb, AUDIO_BUCKET } from "@/lib/db/admin";

export interface SessionRow {
  id: string;
  kind: string;
  started_at: string;
  ended_at: string | null;
  end_reason: string | null;
  minutes_active: number | null;
}

export interface WordRow {
  id: string;
  target_deva: string;
  set: "treated" | "untreated" | "warmup" | "reserve";
  accepted_forms: string[];
  prompt_text: string | null;
  semantic_cue_text: string | null;
  phonemic_cue_text: string | null;
  model_text: string | null;
  leitner_box: number;
  graduated_at: string | null;
  created_at: string;
}

export interface AttemptRow {
  id: string;
  session_id: string;
  word_item_id: string | null;
  phase: "warmup" | "practice" | "probe";
  cue_level: string | null;
  live_score: "correct" | "not_yet" | "uncertain";
  slp_label: "correct" | "incorrect" | null;
  latency_ms: number | null;
  created_at: string;
}

export interface AlertRow {
  id: string;
  kind: string;
  details: Record<string, unknown>;
  created_at: string;
  acknowledged_at: string | null;
}

const WORD_COLUMNS =
  "id, target_deva, set, accepted_forms, prompt_text, semantic_cue_text, phonemic_cue_text, model_text, leitner_box, graduated_at, created_at";

export async function loadWords(profileId: string): Promise<WordRow[]> {
  const { data } = await adminDb().from("word_item").select(WORD_COLUMNS).eq("patient_id", profileId).order("created_at");
  return (data ?? []) as WordRow[];
}

export async function loadOverview(profileId: string) {
  const db = adminDb();
  const [sessions, words, alerts] = await Promise.all([
    db
      .from("session")
      .select("id, kind, started_at, ended_at, end_reason, minutes_active")
      .eq("patient_id", profileId)
      .order("started_at", { ascending: false })
      .limit(60),
    loadWords(profileId),
    db
      .from("alert")
      .select("id, kind, details, created_at, acknowledged_at")
      .eq("patient_id", profileId)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);
  const sessionRows = (sessions.data ?? []) as SessionRow[];
  const ids = sessionRows.map((s) => s.id);
  const attempts: AttemptRow[] = [];
  // Chunk the IN list so the query string stays short.
  for (let i = 0; i < ids.length; i += 30) {
    const { data } = await db
      .from("attempt")
      .select("id, session_id, word_item_id, phase, cue_level, live_score, slp_label, latency_ms, created_at")
      .in("session_id", ids.slice(i, i + 30));
    attempts.push(...((data ?? []) as AttemptRow[]));
  }
  attempts.sort((a, b) => a.created_at.localeCompare(b.created_at));
  return { sessions: sessionRows, words, attempts, alerts: (alerts.data ?? []) as AlertRow[] };
}

export async function loadSessionReview(profileId: string, sessionId: string) {
  const db = adminDb();
  const { data: session } = await db
    .from("session")
    .select("id, kind, started_at, ended_at, end_reason, minutes_active")
    .eq("id", sessionId)
    .eq("patient_id", profileId)
    .maybeSingle();
  if (!session) return null;
  const { data: rows } = await db
    .from("attempt")
    .select(
      "id, word_item_id, phase, cue_level, audio_path, latency_ms, transcript_a, transcript_b, live_score, reason_code, slp_label, created_at, word_item(target_deva, set)",
    )
    .eq("session_id", sessionId)
    .order("created_at");
  const attempts = rows ?? [];
  const paths = attempts.map((a) => a.audio_path).filter((p): p is string => !!p);
  const signed = paths.length ? ((await db.storage.from(AUDIO_BUCKET).createSignedUrls(paths, 3600)).data ?? []) : [];
  const audio = new Map(signed.map((s) => [s.path ?? "", s.signedUrl]));
  return {
    session: session as SessionRow,
    attempts: attempts.map((a) => ({
      id: a.id as string,
      phase: a.phase as AttemptRow["phase"],
      cue_level: a.cue_level as string | null,
      latency_ms: a.latency_ms as number | null,
      transcript_a: a.transcript_a as string | null,
      transcript_b: a.transcript_b as string | null,
      live_score: a.live_score as AttemptRow["live_score"],
      slp_label: a.slp_label as AttemptRow["slp_label"],
      word: a.word_item as unknown as { target_deva: string; set: string } | null,
      audioUrl: a.audio_path ? (audio.get(a.audio_path as string) ?? null) : null,
    })),
  };
}
