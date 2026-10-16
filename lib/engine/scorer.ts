// Two-pass scoring of one naming attempt against a known target word.
// Pass A: unbiased STT (saaras:v3 verbatim). Pass B: target-biased STT (saaras:v4 + keyterms).
// Close matches are never accepted as correct: they are where phonemic errors live.

import { normaliseText, phoneticKey, similarity, editDistance, tokenise } from "./hindiNormalise";

export type LiveScore = "correct" | "not_yet" | "uncertain";

export type ReasonCode =
  | "A_EXACT"
  | "A_SELF_CORRECT"
  | "A_CLOSE_B_EXACT"
  | "B_ONLY"
  | "A_CLOSE"
  | "PASS_REQUEST"
  | "EMPTY_STT"
  | "NO_SPEECH"
  | "NO_MATCH";

export type MatchKind = "exact" | "close" | "none";

export interface MatchResult {
  kind: MatchKind;
  /** Accepted form that matched (exact or closest). */
  form?: string;
  /** Token index in the transcript where the match starts. */
  position?: number;
  /** Similarity of the best close match, 0..1. */
  similarity?: number;
}

export interface ScoreInput {
  /** Accepted forms: Devanagari target, Roman spellings, SLP-approved synonyms, English equivalents. */
  acceptedForms: string[];
  transcriptA: string | null;
  /** Null when pass B was skipped (e.g. pass A already exact) or failed. */
  transcriptB: string | null;
  /** Whether the browser VAD heard speech in this attempt. */
  speechDetected: boolean;
}

export interface ScoreResult {
  score: LiveScore;
  reason: ReasonCode;
  selfCorrected: boolean;
  passRequested: boolean;
  matchA: MatchResult;
  matchB: MatchResult | null;
}

// "I don't know" / "skip" phrases: move straight to the next cue.
const PASS_PHRASES = [
  "पता नहीं", "पता नही", "नहीं आता", "नहीं आ रहा", "याद नहीं", "मालूम नहीं", "छोड़ो", "छोडो",
  "pata nahi", "pata nahin", "nahi aata", "nahin aata", "yaad nahi", "malum nahi", "chhodo", "chodo",
  "i don't know", "dont know", "don't know", "skip", "pass",
];

function isClose(a: string, b: string): { close: boolean; sim: number } {
  const sim = similarity(a, b);
  const len = Math.max(Array.from(a).length, Array.from(b).length);
  if (len <= 4) return { close: editDistance(a, b) <= 1, sim };
  return { close: sim >= 0.75, sim };
}

/** Find the best match of any accepted form inside a transcript. */
export function matchTranscript(transcript: string | null, acceptedForms: string[]): MatchResult {
  if (!transcript) return { kind: "none" };
  const tokens = tokenise(transcript);
  if (tokens.length === 0) return { kind: "none" };

  let best: MatchResult = { kind: "none" };

  for (const form of acceptedForms) {
    const formTokens = tokenise(form);
    if (formTokens.length === 0) continue;
    const formNorm = formTokens.join(" ");
    const formKey = phoneticKey(formNorm);

    for (let i = 0; i + formTokens.length <= tokens.length; i++) {
      const window = tokens.slice(i, i + formTokens.length).join(" ");
      if (window === formNorm || phoneticKey(window) === formKey) {
        // Earliest exact match wins.
        if (best.kind !== "exact" || (best.position ?? Infinity) > i) {
          best = { kind: "exact", form, position: i, similarity: 1 };
        }
        continue;
      }
      if (best.kind === "exact") continue;
      const { close, sim } = isClose(phoneticKey(window), formKey);
      if (close && (best.kind === "none" || (best.similarity ?? 0) < sim)) {
        best = { kind: "close", form, position: i, similarity: sim };
      }
    }
  }
  return best;
}

export function isPassRequest(transcript: string | null): boolean {
  if (!transcript) return false;
  const t = normaliseText(transcript);
  return PASS_PHRASES.some((p) => t.includes(normaliseText(p)));
}

export function scoreAttempt(input: ScoreInput): ScoreResult {
  const matchA = matchTranscript(input.transcriptA, input.acceptedForms);
  const matchB = input.transcriptB === null ? null : matchTranscript(input.transcriptB, input.acceptedForms);
  const base = { matchA, matchB, selfCorrected: false, passRequested: false };

  if (matchA.kind === "exact") {
    const selfCorrected = (matchA.position ?? 0) > 0;
    return {
      ...base,
      score: "correct",
      reason: selfCorrected ? "A_SELF_CORRECT" : "A_EXACT",
      selfCorrected,
    };
  }

  const aEmpty = !input.transcriptA || tokenise(input.transcriptA).length === 0;
  if (aEmpty && !input.speechDetected) {
    return { ...base, score: "not_yet", reason: "NO_SPEECH" };
  }

  if (isPassRequest(input.transcriptA)) {
    return { ...base, score: "not_yet", reason: "PASS_REQUEST", passRequested: true };
  }

  if (matchB?.kind === "exact") {
    return { ...base, score: "uncertain", reason: matchA.kind === "close" ? "A_CLOSE_B_EXACT" : "B_ONLY" };
  }

  if (matchA.kind === "close") {
    return { ...base, score: "uncertain", reason: "A_CLOSE" };
  }

  if (aEmpty && input.speechDetected) {
    return { ...base, score: "uncertain", reason: "EMPTY_STT" };
  }

  return { ...base, score: "not_yet", reason: "NO_MATCH" };
}
