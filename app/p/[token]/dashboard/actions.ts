"use server";

import { revalidatePath } from "next/cache";
import { adminDb } from "@/lib/db/admin";
import { deleteProfile, profileFromToken } from "@/lib/profile/service";
import { forgetProfile } from "@/lib/profile/cookie";
import { cachedTextClip, voiceFromSettings } from "@/lib/session/clips";

export interface WordInput {
  id?: string;
  target_deva: string;
  set: "treated" | "untreated" | "reserve";
  accepted_forms: string[];
  prompt_text: string | null;
  semantic_cue_text: string | null;
  phonemic_cue_text: string | null;
  model_text: string | null;
}

const SETS = new Set(["treated", "untreated", "reserve"]);
const DEVANAGARI = /[ऀ-ॿ]/;

function clean(s: string | null | undefined, max = 300) {
  const t = (s ?? "").trim();
  return t ? t.slice(0, max) : null;
}

export async function saveWord(token: string, w: WordInput): Promise<{ error?: string }> {
  const profile = await profileFromToken(token);
  const target = clean(w.target_deva, 40);
  if (!target) return { error: "Type the word first." };
  if (!DEVANAGARI.test(target)) {
    return { error: "Type the word in Hindi script, for example कप. Put English or Roman spellings under 'also accept'." };
  }
  if (!SETS.has(w.set)) return { error: "Choose how to use the word." };
  const row = {
    patient_id: profile.id,
    target_deva: target,
    set: w.set,
    accepted_forms: [...new Set(w.accepted_forms.map((f) => f.trim()).filter(Boolean))].slice(0, 20),
    prompt_text: clean(w.prompt_text),
    semantic_cue_text: clean(w.semantic_cue_text),
    phonemic_cue_text: clean(w.phonemic_cue_text),
    model_text: clean(w.model_text),
    source: "family" as const,
    approved_at: new Date().toISOString(),
  };
  const db = adminDb();
  const { error } = w.id
    ? await db.from("word_item").update(row).eq("id", w.id).eq("patient_id", profile.id)
    : await db.from("word_item").insert(row);
  if (error) return { error: "Could not save the word. Try again." };
  revalidatePath(`/p/${token}/dashboard/words`);
  revalidatePath(`/p/${token}/dashboard`);
  return {};
}

export async function removeWord(token: string, wordId: string) {
  const profile = await profileFromToken(token);
  await adminDb().from("word_item").delete().eq("id", wordId).eq("patient_id", profile.id);
  revalidatePath(`/p/${token}/dashboard/words`);
}

/** Optional family check of one answer. Never changes what happened during practice. */
export async function markAnswer(token: string, attemptId: string, label: "correct" | "incorrect" | null) {
  const profile = await profileFromToken(token);
  const db = adminDb();
  const { data: attempt } = await db
    .from("attempt")
    .select("id, session_id, session(patient_id)")
    .eq("id", attemptId)
    .maybeSingle();
  const owner = (attempt?.session as unknown as { patient_id: string } | null)?.patient_id;
  if (!attempt || owner !== profile.id) throw new Error("not found");
  await db
    .from("attempt")
    .update({ slp_label: label, labelled_at: label ? new Date().toISOString() : null })
    .eq("id", attemptId);
  revalidatePath(`/p/${token}/dashboard/sessions/${attempt.session_id}`);
}

/** Pause or resume. Resuming also closes open safety alerts: the family confirmed everyone is OK. */
export async function setPractice(token: string, status: "active" | "paused") {
  const profile = await profileFromToken(token);
  const db = adminDb();
  await db.from("patient").update({ status }).eq("id", profile.id);
  if (status === "active") {
    await db
      .from("alert")
      .update({ acknowledged_at: new Date().toISOString() })
      .eq("patient_id", profile.id)
      .is("acknowledged_at", null);
  }
  revalidatePath(`/p/${token}/dashboard`);
}

/** Voice preview through the shared clip cache: the session later plays the same file. */
export async function previewLine(token: string, text: string): Promise<{ url?: string; error?: string }> {
  const profile = await profileFromToken(token);
  const line = text.trim();
  if (!line || line.length > 300) return { error: "Nothing to play." };
  try {
    const clip = await cachedTextClip(line, voiceFromSettings(profile.settings));
    return { url: clip.url };
  } catch {
    return { error: "Could not play the voice right now." };
  }
}

export async function deleteEverything(token: string, confirmText: string): Promise<{ error?: string }> {
  if (confirmText.trim().toUpperCase() !== "DELETE") return { error: "Type DELETE to confirm." };
  const profile = await profileFromToken(token);
  await deleteProfile(profile.id);
  await forgetProfile();
  return {};
}
