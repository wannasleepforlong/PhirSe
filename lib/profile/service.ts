// Practice profiles: created by the person or their family, no account and no therapist needed.
// The private link token is the only key. Practice and dashboard routes both check it here.

import "server-only";
import { adminDb, AUDIO_BUCKET } from "@/lib/db/admin";
import { generatePatientToken, hashPatientToken, looksLikeToken } from "@/lib/auth/patientToken";
import { starterRows } from "@/lib/words/starter";

export class ProfileError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

export interface Profile {
  id: string;
  display_name: string;
  honorific: string;
  status: "active" | "paused" | "withdrawn";
  is_demo: boolean;
  settings: Record<string, unknown>;
  family_name: string | null;
  family_phone: string | null;
  created_by_relation: string | null;
  created_at: string;
}

const PROFILE_COLUMNS =
  "id, display_name, honorific, status, is_demo, settings, family_name, family_phone, created_by_relation, created_at, token_revoked_at";

/** Load the profile behind a private link. Paused profiles load too (the dashboard resumes them). */
export async function profileFromToken(token: string | null | undefined): Promise<Profile> {
  if (!looksLikeToken(token)) throw new ProfileError("invalid link", 401);
  const { data, error } = await adminDb()
    .from("patient")
    .select(PROFILE_COLUMNS)
    .eq("access_token_hash", hashPatientToken(token))
    .maybeSingle();
  if (error) throw new ProfileError(error.message, 500);
  if (!data || data.token_revoked_at || data.status === "withdrawn") throw new ProfileError("invalid link", 401);
  return data as Profile;
}

export interface NewProfileInput {
  displayName: string;
  honorific: string;
  relation: string | null;
  familyPhone: string | null;
  storeAudio: boolean;
  /** Throwaway "try it" profile: short sessions, removed after a day. */
  tryDemo?: boolean;
}

/** Showcase profiles can be viewed by anyone with the link but never changed. */
export function isReadOnly(profile: Profile): boolean {
  return profile.settings.read_only === true;
}

const clean = (s: string | null | undefined, max = 80) => {
  const t = (s ?? "").trim();
  return t ? t.slice(0, max) : null;
};

/** Create a profile with the starter word list. Returns the private link token (shown once). */
export async function createProfile(input: NewProfileInput): Promise<{ id: string; token: string }> {
  const name = clean(input.displayName, 40);
  if (!name) throw new ProfileError("name is required");
  const token = generatePatientToken();
  const db = adminDb();
  const { data, error } = await db
    .from("patient")
    .insert({
      slp_id: null,
      display_name: name,
      // An empty honorific is a real choice ("—" on the form): greet by name only.
      honorific: input.honorific.trim().slice(0, 12),
      is_demo: input.tryDemo === true,
      created_by_relation: clean(input.relation, 30),
      family_phone: clean(input.familyPhone, 20),
      access_token_hash: hashPatientToken(token),
      settings: {
        patience_ms: 8000,
        end_of_speech_ms: 1500,
        max_attempt_ms: 10000,
        tts_pace: 0.8,
        tts_speaker: null,
        cue_mode: "increasing",
        session_minutes: 12,
        max_items: 12,
        picture_mode: false,
        probe_days: [1, 3, 5],
        graduation_rule: { consecutive_sessions: 3 },
        store_audio: input.storeAudio,
        try_demo: input.tryDemo === true,
      },
    })
    .select("id")
    .single();
  if (error || !data) throw new ProfileError(error?.message ?? "could not create profile", 500);

  const { error: wordsError } = await db.from("word_item").insert(starterRows(data.id));
  if (wordsError) throw new ProfileError(wordsError.message, 500);
  await db.from("consent").insert({
    patient_id: data.id,
    sessions: true,
    recording: input.storeAudio,
    slp_access: false,
    anonymised_metrics: false,
    demo_use: false,
    signed_at: new Date().toISOString(),
  });
  return { id: data.id, token };
}

/** Delete everything for a profile: recordings in storage, then the rows (sessions, attempts, words cascade). */
export async function deleteProfile(profileId: string): Promise<void> {
  const db = adminDb();
  const folder = `attempts/${profileId}`;
  const { data: sessions } = await db.storage.from(AUDIO_BUCKET).list(folder, { limit: 1000 });
  for (const s of sessions ?? []) {
    const { data: files } = await db.storage.from(AUDIO_BUCKET).list(`${folder}/${s.name}`, { limit: 1000 });
    const paths = (files ?? []).map((f) => `${folder}/${s.name}/${f.name}`);
    if (paths.length) await db.storage.from(AUDIO_BUCKET).remove(paths);
  }
  const { error } = await db.from("patient").delete().eq("id", profileId);
  if (error) throw new ProfileError(error.message, 500);
}
