// Sarvam Bulbul text-to-speech (server only). Used to pre-render approved prompts and cues.

import { fetchWithRetry } from "./retry";

const TTS_URL = "https://api.sarvam.ai/text-to-speech";

export interface TtsRequest {
  text: string;
  speaker?: string;
  /** bulbul:v3 range 0.5–2.0. Slow speech helps people with aphasia. */
  pace?: number;
  languageCode?: string;
  sampleRate?: 16000 | 22050 | 24000;
  codec?: "wav" | "mp3";
  dictId?: string;
}

export interface TtsResult {
  audio: Uint8Array;
  contentType: string;
  ms: number;
}

export const DEFAULT_SPEAKER = "priya";
export const DEFAULT_PACE = 0.8;

export async function synthesize(req: TtsRequest): Promise<TtsResult> {
  const key = process.env.SARVAM_API_KEY;
  if (!key) throw new Error("SARVAM_API_KEY is not set");
  const codec = req.codec ?? "mp3";
  const pace = Math.min(2, Math.max(0.5, req.pace ?? DEFAULT_PACE));

  const started = performance.now();
  const res = await fetchWithRetry(TTS_URL, {
    method: "POST",
    headers: { "api-subscription-key": key, "content-type": "application/json" },
    body: JSON.stringify({
      text: req.text,
      language_code: req.languageCode ?? "hi-IN",
      model: "bulbul:v3",
      speaker: req.speaker ?? DEFAULT_SPEAKER,
      pace,
      speech_sample_rate: req.sampleRate ?? 22050,
      output_audio_codec: codec,
      ...(req.dictId ? { dict_id: req.dictId } : {}),
    }),
  });
  const ms = Math.round(performance.now() - started);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Sarvam TTS ${res.status}: ${body.slice(0, 300)}`);
  }
  const json = (await res.json()) as { audios?: string[] };
  const b64 = json.audios?.[0];
  if (!b64) throw new Error("Sarvam TTS returned no audio");
  return {
    audio: Uint8Array.from(Buffer.from(b64, "base64")),
    contentType: codec === "mp3" ? "audio/mpeg" : "audio/wav",
    ms,
  };
}
