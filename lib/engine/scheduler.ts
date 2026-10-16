// Word scheduling across sessions: Leitner boxes for treated words, SLP-gated graduation.
// Untreated words are never practised; they only appear in probes.

import type { ItemOutcome } from "./stateMachine";

export type WordSet = "treated" | "untreated" | "warmup" | "reserve";

export interface ScheduledWord {
  id: string;
  set: WordSet;
  /** 1..4. Box 1 every session, box 2 every 2nd, box 3 every 4th, box 4 only in probes. */
  box: number;
  /** Consecutive sessions in which the word was said at the prompt step with no cue. */
  independentStreak: number;
  graduated: boolean;
}

export const MAX_BOX = 4;
const BOX_EVERY: Record<number, number> = { 1: 1, 2: 2, 3: 4 };

/** Treated words due in this session (sessionNumber starts at 1), capped and in a stable order. */
export function selectPracticeWords(words: ScheduledWord[], sessionNumber: number, maxItems: number): string[] {
  const treated = words.filter((w) => w.set === "treated" && !w.graduated);
  const due = treated.filter((w) => {
    const every = BOX_EVERY[w.box];
    return every !== undefined && (sessionNumber - 1) % every === 0;
  });
  // Lower boxes (harder words) first, then fill from not-due words if the list is short.
  const byBox = [...due].sort((a, b) => a.box - b.box);
  if (byBox.length < maxItems) {
    const extra = treated
      .filter((w) => !byBox.includes(w) && w.box < MAX_BOX)
      .sort((a, b) => a.box - b.box);
    byBox.push(...extra.slice(0, maxItems - byBox.length));
  }
  return interleave(byBox.slice(0, maxItems).map((w) => w.id), sessionNumber);
}

/** Deterministic shuffle so the order changes between sessions but tests stay stable. */
export function interleave(ids: string[], seed: number): string[] {
  const out = [...ids];
  // mulberry32 PRNG
  let a = seed >>> 0;
  const rand = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Probe set: up to n treated + n untreated words, alternating, no cues. */
export function selectProbeWords(words: ScheduledWord[], perSet: number, seed: number): string[] {
  const treated = interleave(words.filter((w) => w.set === "treated").map((w) => w.id), seed).slice(0, perSet);
  const untreated = interleave(words.filter((w) => w.set === "untreated").map((w) => w.id), seed + 7).slice(0, perSet);
  const out: string[] = [];
  for (let i = 0; i < Math.max(treated.length, untreated.length); i++) {
    if (treated[i]) out.push(treated[i]);
    if (untreated[i]) out.push(untreated[i]);
  }
  return out;
}

export interface GraduationRule {
  consecutiveSessions: number;
}

export interface BoxUpdate {
  id: string;
  box: number;
  independentStreak: number;
  /** True when the word meets the graduation rule. The SLP must confirm before it is swapped. */
  proposeGraduation: boolean;
}

/**
 * Update boxes after a session from practice outcomes. The first practice exposure of each word decides:
 * independent -> up a box; cued retrieval -> stay; model step -> back to box 1.
 */
export function updateBoxes(
  words: ScheduledWord[],
  outcomes: ItemOutcome[],
  rule: GraduationRule = { consecutiveSessions: 3 },
): BoxUpdate[] {
  const firstExposure = new Map<string, ItemOutcome>();
  for (const o of outcomes) {
    if (o.phase === "practice" && !firstExposure.has(o.itemId)) firstExposure.set(o.itemId, o);
  }
  const updates: BoxUpdate[] = [];
  for (const w of words) {
    const o = firstExposure.get(w.id);
    if (!o || w.set !== "treated") continue;
    let box = w.box;
    let streak = w.independentStreak;
    if (o.independent) {
      box = Math.min(MAX_BOX, box + 1);
      streak += 1;
    } else if (o.retrieved) {
      streak = 0;
    } else {
      box = 1;
      streak = 0;
    }
    updates.push({ id: w.id, box, independentStreak: streak, proposeGraduation: streak >= rule.consecutiveSessions });
  }
  return updates;
}

/** Probe days default to Mon/Wed/Fri (0 = Sunday). */
export function isProbeDay(date: Date, probeDays: number[] = [1, 3, 5]): boolean {
  return probeDays.includes(date.getDay());
}
