"use server";

import { revalidatePath } from "next/cache";
import { currentSlp, slpDb } from "@/lib/db/server";

const LABELS = new Set(["correct", "incorrect"]);
const ERROR_TYPES = new Set(["semantic", "phonemic", "no_response", "unrelated", "other"]);

/** SLP relabels one attempt. RLS limits updates to the SLP's own patients' attempts. */
export async function labelAttempt(attemptId: string, label: string | null, errorType: string | null) {
  const me = await currentSlp();
  if (!me) throw new Error("not signed in");
  if (label !== null && !LABELS.has(label)) throw new Error("bad label");
  if (errorType !== null && !ERROR_TYPES.has(errorType)) throw new Error("bad error type");
  const db = await slpDb();
  const { data, error } = await db
    .from("attempt")
    .update({
      slp_label: label,
      slp_error_type: label === "incorrect" ? errorType : null,
      labelled_at: label ? new Date().toISOString() : null,
    })
    .eq("id", attemptId)
    .select("session_id")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath(`/slp/sessions/${data.session_id}`);
}

/** Acknowledge a safety alert. The patient's practice stays paused until the SLP resumes it. */
export async function acknowledgeAlert(alertId: string, patientId: string) {
  const me = await currentSlp();
  if (!me) throw new Error("not signed in");
  const db = await slpDb();
  const { error } = await db
    .from("alert")
    .update({ acknowledged_at: new Date().toISOString(), acknowledged_by: me.slpId })
    .eq("id", alertId);
  if (error) throw new Error(error.message);
  revalidatePath(`/slp/patients/${patientId}`);
  revalidatePath("/slp");
}

export async function setPatientStatus(patientId: string, status: "active" | "paused") {
  const me = await currentSlp();
  if (!me) throw new Error("not signed in");
  const db = await slpDb();
  const { error } = await db.from("patient").update({ status }).eq("id", patientId);
  if (error) throw new Error(error.message);
  revalidatePath(`/slp/patients/${patientId}`);
}

// ---------- words ----------

export interface WordInput {
  id?: string;
  target_deva: string;
  set: "treated" | "untreated" | "warmup" | "reserve";
  accepted_forms: string[];
  prompt_text: string | null;
  semantic_cue_text: string | null;
  phonemic_cue_text: string | null;
  model_text: string | null;
  approve: boolean;
}

const SETS = new Set(["treated", "untreated", "warmup", "reserve"]);
const clean = (s: string | null | undefined) => {
  const t = (s ?? "").trim();
  return t ? t.slice(0, 300) : null;
};

/** Save a word. Any save records approval only when the SLP ticks approve; unapproved words are never used in sessions. */
export async function saveWord(patientId: string, w: WordInput) {
  const me = await currentSlp();
  if (!me) throw new Error("not signed in");
  const target = clean(w.target_deva);
  if (!target) throw new Error("target word is required");
  if (!SETS.has(w.set)) throw new Error("bad set");
  const row = {
    patient_id: patientId,
    target_deva: target,
    set: w.set,
    accepted_forms: [...new Set(w.accepted_forms.map((f) => f.trim()).filter(Boolean))].slice(0, 20),
    prompt_text: clean(w.prompt_text),
    semantic_cue_text: clean(w.semantic_cue_text),
    phonemic_cue_text: clean(w.phonemic_cue_text),
    model_text: clean(w.model_text),
    source: "slp" as const,
    approved_at: w.approve ? new Date().toISOString() : null,
    approved_by: w.approve ? me.slpId : null,
  };
  const db = await slpDb();
  const { error } = w.id ? await db.from("word_item").update(row).eq("id", w.id) : await db.from("word_item").insert(row);
  if (error) throw new Error(error.message);
  revalidatePath(`/slp/patients/${patientId}/words`);
}

export async function deleteWord(patientId: string, wordId: string) {
  const me = await currentSlp();
  if (!me) throw new Error("not signed in");
  const db = await slpDb();
  const { error } = await db.from("word_item").delete().eq("id", wordId);
  if (error) throw new Error(error.message);
  revalidatePath(`/slp/patients/${patientId}/words`);
}

// ---------- patients ----------

export interface NewPatientInput {
  display_name: string;
  honorific: string;
  family_name: string | null;
  family_phone: string | null;
  consent: { sessions: boolean; recording: boolean; slp_access: boolean; anonymised_metrics: boolean; demo_use: boolean };
}

/** Create a patient and return their practice link. The token is shown once and only its hash is stored. */
export async function createPatient(input: NewPatientInput): Promise<{ id: string; link: string }> {
  const me = await currentSlp();
  if (!me) throw new Error("not signed in");
  const name = clean(input.display_name);
  if (!name) throw new Error("name is required");
  if (!input.consent.sessions || !input.consent.recording || !input.consent.slp_access) {
    throw new Error("sessions, recording and SLP access consent are required to start");
  }
  const { generatePatientToken, hashPatientToken } = await import("@/lib/auth/patientToken");
  const token = generatePatientToken();
  const db = await slpDb();
  const { data, error } = await db
    .from("patient")
    .insert({
      slp_id: me.slpId,
      display_name: name,
      honorific: clean(input.honorific) ?? "जी",
      family_name: clean(input.family_name),
      family_phone: clean(input.family_phone),
      access_token_hash: hashPatientToken(token),
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "could not create patient");
  await db.from("consent").insert({ patient_id: data.id, ...input.consent, signed_at: new Date().toISOString(), witness_slp_id: me.slpId });
  revalidatePath("/slp");
  return { id: data.id, link: `/p/${token}` };
}

/** Issue a new practice link; the old one stops working at once. */
export async function rotatePatientLink(patientId: string): Promise<string> {
  const me = await currentSlp();
  if (!me) throw new Error("not signed in");
  const { generatePatientToken, hashPatientToken } = await import("@/lib/auth/patientToken");
  const token = generatePatientToken();
  const db = await slpDb();
  const { error } = await db.from("patient").update({ access_token_hash: hashPatientToken(token), token_revoked_at: null }).eq("id", patientId);
  if (error) throw new Error(error.message);
  return `/p/${token}`;
}
