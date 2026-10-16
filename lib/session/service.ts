// Session service: loads state from Postgres, runs the pure state machine, persists the result,
// and turns clip references into playable URLs. All patient-facing session routes go through here.

import "server-only";
import { randomUUID } from "node:crypto";
import { adminDb, AUDIO_BUCKET } from "@/lib/db/admin";
import { hashPatientToken, looksLikeToken } from "@/lib/auth/patientToken";
import {
  DEFAULT_SETTINGS,
  initialState,
  summarise,
  transition,
  type Action,
  type ClipRef,
  type CueStep,
  type SessionEvent,
  type SessionPlan,
  type SessionSettings,
  type SessionState,
} from "@/lib/engine/stateMachine";
import { isProbeDay, selectPracticeWords, selectProbeWords, updateBoxes, type ScheduledWord } from "@/lib/engine/scheduler";
import { scoreAttempt, type ScoreResult } from "@/lib/engine/scorer";
import { scanSafety, type SafetyHit } from "@/lib/engine/safety";
import { parseYesNo } from "@/lib/engine/yesNo";
import { transcribeTwoPass } from "@/lib/speech/sarvamStt";
import { prefetchClips, resolveClips, voiceFromSettings, type ClipContext, type ResolvedClip } from "./clips";
import type { ItemTexts } from "./scripts";

export class SessionError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

interface PatientRow {
  id: string;
  display_name: string;
  honorific: string;
  is_demo: boolean;
  status: string;
  token_revoked_at: string | null;
  settings: Record<string, unknown>;
}

interface WordRow extends ItemTexts {
  id: string;
  set: ScheduledWord["set"];
  accepted_forms: string[];
  image_path: string | null;
  leitner_box: number;
  independent_streak: number;
  graduated_at: string | null;
}

interface SessionRow {
  id: string;
  patient_id: string;
  kind: string;
  plan: SessionPlan;
  state: SessionState;
  started_at: string;
  ended_at: string | null;
}

export interface ClientAction {
  kind: Action["kind"];
  clips: ResolvedClip[];
  listen?: Action["listen"];
  itemId?: string;
  cue?: CueStep;
  progress: Action["progress"];
  phase: SessionState["phase"];
  imageUrl?: string | null;
}

// ---------- loading ----------

export async function patientFromToken(token: string | null): Promise<PatientRow> {
  if (!looksLikeToken(token)) throw new SessionError("invalid link", 401);
  const { data, error } = await adminDb()
    .from("patient")
    .select("id, display_name, honorific, is_demo, status, token_revoked_at, settings")
    .eq("access_token_hash", hashPatientToken(token))
    .maybeSingle();
  if (error) throw new SessionError(error.message, 500);
  if (!data || data.token_revoked_at) throw new SessionError("invalid link", 401);
  if (data.status !== "active") throw new SessionError("practice is paused for this patient", 403);
  return data as PatientRow;
}

async function loadWords(patientId: string): Promise<WordRow[]> {
  const { data, error } = await adminDb()
    .from("word_item")
    .select(
      "id, set, target_deva, accepted_forms, prompt_text, frame_text, semantic_cue_text, phonemic_cue_text, model_text, image_path, leitner_box, independent_streak, graduated_at",
    )
    .eq("patient_id", patientId)
    .not("approved_at", "is", null);
  if (error) throw new SessionError(error.message, 500);
  return (data ?? []) as WordRow[];
}

function settingsFrom(raw: Record<string, unknown>): SessionSettings & { maxItems: number; probeDays: number[] } {
  const num = (k: string, d: number) => (typeof raw[k] === "number" ? (raw[k] as number) : d);
  return {
    ...DEFAULT_SETTINGS,
    cueMode: raw.cue_mode === "decreasing" ? "decreasing" : "increasing",
    patienceMs: num("patience_ms", DEFAULT_SETTINGS.patienceMs),
    endOfSpeechMs: num("end_of_speech_ms", DEFAULT_SETTINGS.endOfSpeechMs),
    maxAttemptMs: num("max_attempt_ms", DEFAULT_SETTINGS.maxAttemptMs),
    sessionMinutes: num("session_minutes", DEFAULT_SETTINGS.sessionMinutes),
    maxItems: num("max_items", 12),
    probeDays: Array.isArray(raw.probe_days) ? (raw.probe_days as number[]) : [1, 3, 5],
  };
}

function clipContext(patient: PatientRow, words: WordRow[]): ClipContext {
  return {
    patientId: patient.id,
    naming: { displayName: patient.display_name, honorific: patient.honorific },
    voice: voiceFromSettings(patient.settings),
    items: new Map(words.map((w) => [w.id, w])),
  };
}

async function signedImage(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  const { data } = await adminDb().storage.from("images").createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

async function toClient(action: Action, state: SessionState, ctx: ClipContext, pictureMode: boolean): Promise<ClientAction> {
  const clips = await resolveClips(action.clips, ctx);
  const item = action.itemId ? ctx.items.get(action.itemId) : undefined;
  return {
    kind: action.kind,
    clips,
    listen: action.listen,
    itemId: action.itemId,
    cue: action.cue,
    progress: action.progress,
    phase: state.phase,
    imageUrl: pictureMode && item ? await signedImage((item as WordRow).image_path) : null,
  };
}

// ---------- persistence ----------

async function logEvent(sessionId: string, type: string, payload: Record<string, unknown> = {}) {
  await adminDb().from("event").insert({ session_id: sessionId, type, payload });
}

async function saveState(row: SessionRow, state: SessionState) {
  const { error } = await adminDb().from("session").update({ state }).eq("id", row.id);
  if (error) throw new SessionError(error.message, 500);
}

const TERMINAL = new Set(["DONE", "SAFETY_EXIT"]);

async function finalise(row: SessionRow, state: SessionState, words: WordRow[], safety?: SafetyHit | "help_button") {
  const db = adminDb();
  const endedAt = new Date();
  const minutes = (endedAt.getTime() - new Date(row.started_at).getTime()) / 60000;
  await db
    .from("session")
    .update({ ended_at: endedAt.toISOString(), end_reason: state.endReason ?? "completed", minutes_active: minutes })
    .eq("id", row.id)
    .is("ended_at", null);

  if (row.kind !== "judge_demo") {
    const scheduled: ScheduledWord[] = words.map((w) => ({
      id: w.id,
      set: w.set,
      box: w.leitner_box,
      independentStreak: w.independent_streak,
      graduated: !!w.graduated_at,
    }));
    const updates = updateBoxes(scheduled, state.outcomes);
    await Promise.all(
      updates.map((u) =>
        db.from("word_item").update({ leitner_box: u.box, independent_streak: u.independentStreak }).eq("id", u.id),
      ),
    );
  }

  if (safety) {
    const kind = safety === "help_button" ? "help_button" : safety.category === "stop" ? null : safety.category;
    if (kind) {
      // Practice stays paused until the SLP has checked on the patient and resumes it.
      if (row.kind !== "judge_demo") await db.from("patient").update({ status: "paused" }).eq("id", row.patient_id);
      await db.from("alert").insert({
        patient_id: row.patient_id,
        session_id: row.id,
        kind,
        details: safety === "help_button" ? {} : { phrase: safety.phrase },
      });
    }
  }
  await logEvent(row.id, "session_end", { reason: state.endReason, summary: summarise(state) });
}

// ---------- public API ----------

export interface StartResult {
  sessionId: string;
  action: ClientAction;
  prefetch: { key: string; url: string }[];
}

export async function startSession(token: string | null, kind: "practice" | "judge_demo" = "practice"): Promise<StartResult> {
  const patient = await patientFromToken(token);
  const words = await loadWords(patient.id);
  const settings = settingsFrom(patient.settings);
  const db = adminDb();

  // A session left open (tab closed, phone locked) is abandoned once a new one starts.
  await db
    .from("session")
    .update({ ended_at: new Date().toISOString(), end_reason: "abandoned" })
    .eq("patient_id", patient.id)
    .is("ended_at", null);

  const { count } = await db
    .from("session")
    .select("id", { count: "exact", head: true })
    .eq("patient_id", patient.id)
    .neq("kind", "judge_demo");
  const sessionNumber = (count ?? 0) + 1;

  const scheduled: ScheduledWord[] = words.map((w) => ({
    id: w.id,
    set: w.set,
    box: w.leitner_box,
    independentStreak: w.independent_streak,
    graduated: !!w.graduated_at,
  }));
  const maxItems = kind === "judge_demo" ? 3 : settings.maxItems;
  const practiceItemIds = selectPracticeWords(scheduled, sessionNumber, maxItems);
  if (practiceItemIds.length === 0) throw new SessionError("no approved practice words yet", 409);
  const probeToday = kind === "practice" && (sessionNumber === 1 || isProbeDay(new Date(), settings.probeDays));
  const probeItemIds = probeToday ? selectProbeWords(scheduled, 5, sessionNumber) : [];

  const plan: SessionPlan = { practiceItemIds, probeItemIds, settings };
  const now = Date.now();
  const t = transition(plan, initialState(plan, now), { type: "start", atMs: now });

  const { data: row, error } = await db
    .from("session")
    .insert({ patient_id: patient.id, kind: probeToday ? "practice_probe" : kind, plan, state: t.state })
    .select("id, patient_id, kind, plan, state, started_at, ended_at")
    .single();
  if (error || !row) throw new SessionError(error?.message ?? "could not create session", 500);
  await logEvent(row.id, "start", { sessionNumber, practice: practiceItemIds.length, probe: probeItemIds.length });

  const ctx = clipContext(patient, words);
  const pictureMode = patient.settings.picture_mode === true;
  const action = await toClient(t.action, t.state, ctx, pictureMode);

  // Render every clip this session can need, so later turns only play cached audio.
  const refs: ClipRef[] = [];
  for (const id of [...probeItemIds, ...practiceItemIds]) {
    for (const cue of ["prompt", "semantic", "phonemic", "model"] as CueStep[]) refs.push({ type: "item", itemId: id, cue });
  }
  for (const key of ["safety_check", "warmup", "probe_intro", "probe_thanks", "practice_intro", "effort", "easier", "close", "paused", "safety_exit"] as const) {
    refs.push({ type: "system", key });
  }
  for (let v = 0; v < settings.praiseVariants; v++) refs.push({ type: "system", key: "praise", variant: v });
  const prefetch = (await prefetchClips(refs, ctx)).map((c) => ({ key: c.key, url: c.url }));

  return { sessionId: row.id, action, prefetch };
}

async function loadSession(token: string | null, sessionId: string) {
  const patient = await patientFromToken(token);
  const { data, error } = await adminDb()
    .from("session")
    .select("id, patient_id, kind, plan, state, started_at, ended_at")
    .eq("id", sessionId)
    .eq("patient_id", patient.id)
    .maybeSingle();
  if (error) throw new SessionError(error.message, 500);
  if (!data) throw new SessionError("session not found", 404);
  const words = await loadWords(patient.id);
  return { patient, row: data as SessionRow, words };
}

async function advance(
  patient: PatientRow,
  row: SessionRow,
  words: WordRow[],
  event: SessionEvent,
  safety?: SafetyHit | "help_button",
): Promise<ClientAction> {
  if (row.ended_at) throw new SessionError("session already ended", 409);
  const t = transition(row.plan, row.state, event);
  await saveState(row, t.state);
  await logEvent(row.id, event.type, { phase: t.state.phase, action: t.action.kind });
  if (TERMINAL.has(t.state.phase)) await finalise(row, t.state, words, safety);
  return toClient(t.action, t.state, clipContext(patient, words), patient.settings.picture_mode === true);
}

export type ClientEventType = "played" | "yes" | "no" | "silence_timeout" | "skip" | "pause" | "resume" | "stop" | "help";

export async function handleEvent(token: string | null, sessionId: string, type: ClientEventType): Promise<ClientAction> {
  const { patient, row, words } = await loadSession(token, sessionId);
  const atMs = Date.now();
  if (type === "help") return advance(patient, row, words, { type: "safety", atMs }, "help_button");
  return advance(patient, row, words, { type, atMs } as SessionEvent);
}

export interface AttemptInput {
  audio: Blob;
  latencyMs: number | null;
  durationMs: number | null;
  speechDetected: boolean;
}

export interface AttemptResult {
  action: ClientAction;
  score?: Pick<ScoreResult, "score" | "reason">;
}

export async function handleAttempt(token: string | null, sessionId: string, input: AttemptInput): Promise<AttemptResult> {
  const { patient, row, words } = await loadSession(token, sessionId);
  const state = row.state;
  const atMs = Date.now();
  const last = state.lastAction;
  const itemId = last?.itemId;
  const item = itemId ? words.find((w) => w.id === itemId) : undefined;
  const acceptedForms = item ? [item.target_deva, ...item.accepted_forms] : [];

  const stt = await transcribeTwoPass(input.audio, acceptedForms.length ? acceptedForms : ["हाँ", "नहीं"]);
  const transcriptA = stt.a?.transcript ?? null;
  const transcriptB = stt.b?.transcript ?? null;

  // Safety first: any emergency or distress phrase ends the session.
  const hits = scanSafety(transcriptA, transcriptB);
  const urgent = hits.find((h) => h.category !== "stop");
  if (urgent) {
    await logEvent(row.id, "safety_keyword", { category: urgent.category, phrase: urgent.phrase, transcriptA });
    return { action: await advance(patient, row, words, { type: "safety", atMs }, urgent) };
  }

  // Yes/no questions are answered by voice or by the big buttons.
  if (last?.kind === "ask_yes_no") {
    const yn = parseYesNo(transcriptA ?? transcriptB);
    if (yn === "unknown") {
      return { action: await toClient(last, state, clipContext(patient, words), false) };
    }
    return { action: await advance(patient, row, words, { type: yn, atMs }) };
  }

  if (hits.some((h) => h.category === "stop")) {
    return { action: await advance(patient, row, words, { type: "stop", atMs }) };
  }

  const phase = state.phase === "WARMUP" ? "warmup" : state.phase === "PROBE" ? "probe" : "practice";
  const result: ScoreResult | null = item
    ? scoreAttempt({ acceptedForms, transcriptA, transcriptB, speechDetected: input.speechDetected })
    : null;

  // Store the attempt. Audio is kept only for the SLP's review.
  const audioPath = `attempts/${patient.id}/${row.id}/${randomUUID()}.wav`;
  const up = await adminDb().storage.from(AUDIO_BUCKET).upload(audioPath, input.audio, { contentType: "audio/wav" });
  await adminDb().from("attempt").insert({
    session_id: row.id,
    word_item_id: item?.id ?? null,
    phase,
    cue_level: last?.cue ?? null,
    audio_path: up.error ? null : audioPath,
    duration_ms: input.durationMs,
    latency_ms: input.latencyMs,
    transcript_a: transcriptA,
    transcript_b: transcriptB,
    live_score: result?.score ?? "not_yet",
    reason_code: result?.reason ?? (phase === "warmup" ? "WARMUP" : "NO_ITEM"),
    self_corrected: result?.selfCorrected ?? false,
    stt_ms_a: stt.a?.ms ?? null,
    stt_ms_b: stt.b?.ms ?? null,
    verifier_status: item ? "pending" : "skipped",
  });
  if (stt.errors.length) await logEvent(row.id, "stt_error", { errors: stt.errors });

  const action = await advance(patient, row, words, {
    type: "attempt",
    atMs,
    score: result?.score ?? "not_yet",
    passRequested: result?.passRequested,
  });
  return { action, score: result ? { score: result.score, reason: result.reason } : undefined };
}
