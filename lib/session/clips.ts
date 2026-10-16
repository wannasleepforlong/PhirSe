// Resolve clip references to playable audio URLs.
// Clips are content-addressed (hash of text + voice). A missing clip is rendered once with
// Bulbul TTS, stored, and reused for every later session.

import "server-only";
import { createHash } from "node:crypto";
import { adminDb, AUDIO_BUCKET } from "@/lib/db/admin";
import { synthesize, DEFAULT_PACE, DEFAULT_SPEAKER } from "@/lib/speech/sarvamTts";
import type { ClipRef } from "@/lib/engine/stateMachine";
import { itemClipText, systemClipText, type ItemTexts, type PatientNaming } from "./scripts";

export interface Voice {
  speaker: string;
  pace: number;
}

export interface ResolvedClip {
  url: string;
  text: string;
}

export interface ClipContext {
  patientId: string;
  naming: PatientNaming;
  voice: Voice;
  items: Map<string, ItemTexts & { id: string }>;
}

const SIGNED_URL_SECONDS = 60 * 60;

export function voiceFromSettings(settings: Record<string, unknown>): Voice {
  return {
    speaker: typeof settings.tts_speaker === "string" ? settings.tts_speaker : DEFAULT_SPEAKER,
    pace: typeof settings.tts_pace === "number" ? settings.tts_pace : DEFAULT_PACE,
  };
}

export function clipText(ref: ClipRef, ctx: ClipContext): string {
  if (ref.type === "system") return systemClipText(ref.key, ctx.naming, ref.variant ?? 0);
  const item = ctx.items.get(ref.itemId);
  if (!item) throw new Error(`Unknown item ${ref.itemId}`);
  return itemClipText(item, ref.cue);
}

function clipPath(text: string, voice: Voice): string {
  const h = createHash("sha256").update(`${voice.speaker}|${voice.pace}|${text}`).digest("hex").slice(0, 32);
  return `clips/${h}.mp3`;
}

async function ensureClip(text: string, voice: Voice, ref: ClipRef, ctx: ClipContext): Promise<string> {
  const db = adminDb();
  const path = clipPath(text, voice);
  const { data: existing } = await db.from("audio_asset").select("id").eq("storage_path", path).limit(1);
  if (existing && existing.length > 0) return path;

  const tts = await synthesize({ text, speaker: voice.speaker, pace: voice.pace, codec: "mp3" });
  const up = await db.storage.from(AUDIO_BUCKET).upload(path, tts.audio, { contentType: tts.contentType, upsert: true });
  if (up.error) throw new Error(`clip upload failed: ${up.error.message}`);

  const isItem = ref.type === "item";
  await db.from("audio_asset").insert({
    patient_id: ctx.patientId,
    word_item_id: isItem ? ref.itemId : null,
    kind: isItem ? ref.cue : ref.key === "praise" ? "praise" : "system",
    system_key: isItem ? null : ref.key,
    variant: isItem ? 0 : (ref.variant ?? 0),
    text,
    speaker: voice.speaker,
    pace: voice.pace,
    storage_path: path,
    source: "tts",
  });
  return path;
}

export async function resolveClips(refs: ClipRef[], ctx: ClipContext): Promise<ResolvedClip[]> {
  const db = adminDb();
  return Promise.all(
    refs.map(async (ref) => {
      const text = clipText(ref, ctx);
      const path = await ensureClip(text, ctx.voice, ref, ctx);
      const { data, error } = await db.storage.from(AUDIO_BUCKET).createSignedUrl(path, SIGNED_URL_SECONDS);
      if (error || !data) throw new Error(`signed url failed: ${error?.message}`);
      return { url: data.signedUrl, text };
    }),
  );
}

/** Render and sign many clips with limited parallelism (session start prefetch). */
export async function prefetchClips(refs: ClipRef[], ctx: ClipContext, concurrency = 6): Promise<ResolvedClip[]> {
  const out: ResolvedClip[] = [];
  for (let i = 0; i < refs.length; i += concurrency) {
    out.push(...(await resolveClips(refs.slice(i, i + concurrency), ctx)));
  }
  return out;
}
