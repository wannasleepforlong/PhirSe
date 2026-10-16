// Sarvam speech-to-text (server only).
// Pass A: saaras:v3 + mode=verbatim, no biasing (honest pass).
// Pass B: saaras:v4 + keyterms (target-biased pass). keyterms only works on v4; mode only on v3.

import { fetchWithRetry } from "./retry";

const STT_URL = "https://api.sarvam.ai/speech-to-text";
const MAX_KEYTERMS = 50;
const MAX_KEYTERM_CHARS = 64;

export type SttModel = "saaras:v3" | "saaras:v4";
export type SttMode = "transcribe" | "verbatim" | "translit" | "codemix";

export interface SttRequest {
  audio: Blob;
  model: SttModel;
  mode?: SttMode;
  keyterms?: string[];
  languageCode?: string;
  filename?: string;
}

export interface SttResult {
  transcript: string;
  requestId: string | null;
  ms: number;
}

export class SarvamError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

function apiKey(): string {
  const key = process.env.SARVAM_API_KEY;
  if (!key) throw new SarvamError("SARVAM_API_KEY is not set", 500);
  return key;
}

export async function transcribe(req: SttRequest): Promise<SttResult> {
  const form = new FormData();
  form.append("file", req.audio, req.filename ?? "attempt.wav");
  form.append("model", req.model);
  form.append("language_code", req.languageCode ?? "hi-IN");
  if (req.mode && req.model === "saaras:v3") form.append("mode", req.mode);
  if (req.keyterms?.length && req.model === "saaras:v4") {
    const terms = [...new Set(req.keyterms.map((t) => t.trim()).filter(Boolean))]
      .map((t) => t.slice(0, MAX_KEYTERM_CHARS))
      .slice(0, MAX_KEYTERMS);
    form.append("keyterms", JSON.stringify(terms));
  }

  const started = performance.now();
  const res = await fetchWithRetry(STT_URL, {
    method: "POST",
    headers: { "api-subscription-key": apiKey() },
    body: form,
  }, 3);
  const ms = Math.round(performance.now() - started);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new SarvamError(`Sarvam STT ${res.status}: ${body.slice(0, 300)}`, res.status);
  }
  const json = (await res.json()) as { transcript?: string; request_id?: string | null };
  return { transcript: json.transcript ?? "", requestId: json.request_id ?? null, ms };
}

export interface TwoPassResult {
  a: SttResult | null;
  b: SttResult | null;
  errors: string[];
}

/**
 * Run pass A and pass B in parallel. A failure in one pass does not fail the other:
 * the scorer treats a missing pass B as "skipped" and a missing pass A as no transcript.
 */
export async function transcribeTwoPass(audio: Blob, keyterms: string[]): Promise<TwoPassResult> {
  const [a, b] = await Promise.allSettled([
    transcribe({ audio, model: "saaras:v3", mode: "verbatim" }),
    transcribe({ audio, model: "saaras:v4", keyterms }),
  ]);
  const errors: string[] = [];
  if (a.status === "rejected") errors.push(`A: ${String(a.reason?.message ?? a.reason)}`);
  if (b.status === "rejected") errors.push(`B: ${String(b.reason?.message ?? b.reason)}`);
  return {
    a: a.status === "fulfilled" ? a.value : null,
    b: b.status === "fulfilled" ? b.value : null,
    errors,
  };
}
