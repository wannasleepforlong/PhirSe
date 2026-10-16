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
  /** Stable cache key (storage path). */
  key: string;
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

async function renderClip(text: string, path: string, ref: ClipRef, ctx: ClipContext): Promise<void> {
  const db = adminDb();
  const tts = await synthesize({ text, speaker: ctx.voice.speaker, pace: ctx.voice.pace, codec: "mp3" });
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
    speaker: ctx.voice.speaker,
    pace: ctx.voice.pace,
    storage_path: path,
    source: "tts",
  });
}

/**
 * Resolve clips: one query to find which are already rendered, render the missing ones
 * (limited parallelism, Sarvam rate limits), then sign all URLs in one call.
 * `key` is the stable storage path; the browser caches audio by key, not by signed URL.
 */
export async function resolveClips(refs: ClipRef[], ctx: ClipContext, concurrency = 3): Promise<ResolvedClip[]> {
  if (refs.length === 0) return [];
  const db = adminDb();
  const entries = refs.map((ref) => {
    const text = clipText(ref, ctx);
    return { ref, text, path: clipPath(text, ctx.voice) };
  });
  const unique = [...new Map(entries.map((e) => [e.path, e])).values()];

  // Chunk the lookup so the PostgREST query string stays short.
  const have = new Set<string>();
  for (let i = 0; i < unique.length; i += 40) {
    const { data: existing, error } = await db
      .from("audio_asset")
      .select("storage_path")
      .in("storage_path", unique.slice(i, i + 40).map((e) => e.path));
    if (error) throw new Error(`clip lookup failed: ${error.message}`);
    for (const r of existing ?? []) have.add(r.storage_path as string);
  }
  const missing = unique.filter((e) => !have.has(e.path));
  for (let i = 0; i < missing.length; i += concurrency) {
    await Promise.all(missing.slice(i, i + concurrency).map((e) => renderClip(e.text, e.path, e.ref, ctx)));
  }

  const { data: signed, error: signError } = await db.storage
    .from(AUDIO_BUCKET)
    .createSignedUrls(unique.map((e) => e.path), SIGNED_URL_SECONDS);
  if (signError || !signed) throw new Error(`signed url failed: ${signError?.message}`);
  const urlByPath = new Map(signed.map((s) => [s.path, s.signedUrl]));
  return entries.map((e) => {
    const url = urlByPath.get(e.path);
    if (!url) throw new Error(`no signed url for ${e.path}`);
    return { url, text: e.text, key: e.path };
  });
}

/** Session start prefetch: same as resolveClips, kept as a named entry point. */
export const prefetchClips = resolveClips;
