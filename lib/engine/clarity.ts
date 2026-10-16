// Clarity results written by the background verifier, and summaries for the dashboard. Pure functions.

export interface SoundScore {
  unit: string;
  score: number;
  start_s: number;
  end_s: number;
}

export interface ClarityResult {
  clarity: number; // 0..100
  word_match: number;
  articulation: number;
  fluency: number;
  recording: number;
  verdict: "match" | "close" | "no_match" | "no_speech";
  form: string | null;
  heard: string;
  similarity: number;
  weakest: string | null;
  sounds: SoundScore[];
  flags: string[];
  source?: "sarvam" | "indicconformer";
  speech_clarity?: number | null;
  language?: string | null;
  language_probability?: number | null;
  quality?: { loudness_dbfs: number; snr_db: number; onset_s: number; longest_pause_s: number };
}

export function parseClarity(value: unknown): ClarityResult | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Partial<ClarityResult>;
  if (typeof v.clarity !== "number" || !Array.isArray(v.flags)) return null;
  return { sounds: [], weakest: null, form: null, heard: "", ...v } as ClarityResult;
}

export interface ClarityPoint {
  sessionId: string;
  clarity: number; // mean over scored practice/probe answers that contained speech
  scored: number;
}

/** Mean clarity per session, in the order given. Sessions with no scored speech are left out. */
export function claritySeries(
  attempts: Array<{ session_id: string; phase: string; clarity: unknown }>,
  sessionOrder: string[],
): ClarityPoint[] {
  const sums = new Map<string, { total: number; n: number }>();
  for (const a of attempts) {
    if (a.phase === "warmup") continue;
    const c = parseClarity(a.clarity);
    if (!c || c.verdict === "no_speech") continue;
    const s = sums.get(a.session_id) ?? { total: 0, n: 0 };
    s.total += c.clarity;
    s.n += 1;
    sums.set(a.session_id, s);
  }
  return sessionOrder
    .filter((id) => sums.has(id))
    .map((id) => {
      const s = sums.get(id)!;
      return { sessionId: id, clarity: Math.round(s.total / s.n), scored: s.n };
    });
}

export type RecordingTip = "too_quiet" | "noisy" | "clipped" | "other_speaker";

/** Recording problems that showed up in at least a quarter of recent scored answers (min 3). */
export function recordingTips(attempts: Array<{ clarity: unknown }>, minShare = 0.25): RecordingTip[] {
  const scored = attempts.map((a) => parseClarity(a.clarity)).filter((c): c is ClarityResult => !!c);
  if (scored.length < 3) return [];
  const tips: RecordingTip[] = [];
  for (const flag of ["too_quiet", "noisy", "clipped", "other_speaker"] as RecordingTip[]) {
    const n = scored.filter((c) => c.flags.includes(flag)).length;
    if (n >= 3 && n / scored.length >= minShare) tips.push(flag);
  }
  return tips;
}

const LANGUAGE_NAMES: Record<string, string> = {
  "hi-IN": "Hindi", "en-IN": "English", "bn-IN": "Bengali", "ta-IN": "Tamil", "te-IN": "Telugu",
  "kn-IN": "Kannada", "ml-IN": "Malayalam", "mr-IN": "Marathi", "gu-IN": "Gujarati", "pa-IN": "Punjabi", "od-IN": "Odia",
};

/** "Hindi, 98% sure" style label for the language Sarvam detected. */
export function languageLabel(c: Pick<ClarityResult, "language" | "language_probability">): string | null {
  if (!c.language) return null;
  const name = LANGUAGE_NAMES[c.language] ?? c.language;
  return c.language_probability == null ? name : `${name}, ${Math.round(c.language_probability * 100)}%`;
}
