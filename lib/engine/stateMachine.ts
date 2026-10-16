// Server-owned therapy session state machine. Pure and deterministic:
// (state, event) -> (state, action). The browser only plays clips and listens.

import type { LiveScore } from "./scorer";

export type CueStep = "prompt" | "semantic" | "phonemic" | "model";
export type CueMode = "increasing" | "decreasing";

export type SystemClip =
  | "hello"           // "Namaste <name>!" — the only per-patient clip
  | "greeting"        // AI disclosure + "shall we start?" (shared by all patients)
  | "safety_check"    // "any new problem today?"
  | "warmup"
  | "probe_intro"
  | "probe_thanks"    // neutral, no correctness feedback
  | "practice_intro"
  | "praise"
  | "effort"          // praise for trying, after the model step
  | "easier"          // encouragement before switching to easier content
  | "paused"
  | "close"
  | "goodbye"         // patient declined to start
  | "safety_exit";

export type ClipRef =
  | { type: "system"; key: SystemClip; variant?: number }
  | { type: "item"; itemId: string; cue: CueStep };

export interface ListenSpec {
  patienceMs: number;
  endOfSpeechMs: number;
  maxAttemptMs: number;
}

export type ActionKind = "play_and_listen" | "play_only" | "ask_yes_no" | "safety_exit" | "end";

export interface Action {
  kind: ActionKind;
  clips: ClipRef[];
  listen?: ListenSpec;
  /** Item being practised or probed, if any. */
  itemId?: string;
  cue?: CueStep;
  progress: { done: number; total: number };
}

export interface SessionSettings {
  cueMode: CueMode;
  patienceMs: number;
  endOfSpeechMs: number;
  maxAttemptMs: number;
  sessionMinutes: number;
  /** Misses in a row before switching to easier content and shortening the session. */
  maxMissesInRow: number;
  /** Items left after the session is shortened. */
  itemsAfterShorten: number;
  praiseVariants: number;
}

export const DEFAULT_SETTINGS: SessionSettings = {
  cueMode: "increasing",
  patienceMs: 8000,
  endOfSpeechMs: 1500,
  maxAttemptMs: 10000,
  sessionMinutes: 12,
  maxMissesInRow: 3,
  itemsAfterShorten: 2,
  praiseVariants: 6,
};

export interface SessionPlan {
  practiceItemIds: string[];
  /** Empty when today is not a probe day. */
  probeItemIds: string[];
  settings: SessionSettings;
}

export type Phase =
  | "GREETING"
  | "SAFETY_CHECK"
  | "WARMUP"
  | "PROBE"
  | "ITEM"
  | "CLOSE"
  | "DONE"
  | "PAUSED"
  | "SAFETY_EXIT";

export type EndReason = "completed" | "time" | "patient_stop" | "declined" | "safety" | "shortened";

interface QueueEntry {
  itemId: string;
  /** Index into the cue ladder where this exposure starts. */
  startLevel: number;
  /** Re-exposures already scheduled for this item in this session. */
  exposure: number;
}

export interface ItemOutcome {
  itemId: string;
  phase: "practice" | "probe";
  /** Cue step at which the item ended. */
  endedAt: CueStep;
  /** Correct before reaching the model step (independent or cued retrieval). */
  retrieved: boolean;
  /** Correct at the very first step of the exposure with no cue. */
  independent: boolean;
  attempts: number;
  uncertainCount: number;
  noResponse: boolean;
}

export interface SessionState {
  phase: Phase;
  pausedFrom?: Exclude<Phase, "PAUSED">;
  startedAtMs: number;
  queue: QueueEntry[];
  current?: { entry: QueueEntry; level: number; attempts: number; uncertain: number };
  probeIndex: number;
  missesInRow: number;
  shortened: boolean;
  praiseCount: number;
  outcomes: ItemOutcome[];
  endReason?: EndReason;
  lastAction?: Action;
}

export type SessionEvent =
  | { type: "start"; atMs: number }
  | { type: "played"; atMs: number } // a play_only action finished playing
  | { type: "yes"; atMs: number }
  | { type: "no"; atMs: number }
  | { type: "attempt"; atMs: number; score: LiveScore; passRequested?: boolean }
  | { type: "silence_timeout"; atMs: number }
  | { type: "skip"; atMs: number }
  | { type: "pause"; atMs: number }
  | { type: "resume"; atMs: number }
  | { type: "stop"; atMs: number } // patient asked to stop (button or "bas karo")
  | { type: "safety"; atMs: number }; // help button or safety keyword

export interface Transition {
  state: SessionState;
  action: Action;
}

export function cueLadder(mode: CueMode): CueStep[] {
  return mode === "increasing"
    ? ["prompt", "semantic", "phonemic", "model"]
    : ["model", "phonemic", "semantic", "prompt"];
}

export function initialState(plan: SessionPlan, atMs: number): SessionState {
  const startLevel = 0;
  return {
    phase: "GREETING",
    startedAtMs: atMs,
    queue: plan.practiceItemIds.map((itemId) => ({ itemId, startLevel, exposure: 0 })),
    probeIndex: 0,
    missesInRow: 0,
    shortened: false,
    praiseCount: 0,
    outcomes: [],
  };
}

// ---------- helpers ----------

function listenSpec(s: SessionSettings): ListenSpec {
  return { patienceMs: s.patienceMs, endOfSpeechMs: s.endOfSpeechMs, maxAttemptMs: s.maxAttemptMs };
}

function totalItems(plan: SessionPlan, state: SessionState): number {
  const practiceDone = state.outcomes.filter((o) => o.phase === "practice").length;
  const remaining = state.queue.length + (state.current ? 1 : 0);
  return plan.probeItemIds.length + practiceDone + remaining;
}

function progress(plan: SessionPlan, state: SessionState) {
  return { done: state.outcomes.length, total: Math.max(totalItems(plan, state), state.outcomes.length) };
}

function timeUp(plan: SessionPlan, state: SessionState, atMs: number): boolean {
  return atMs - state.startedAtMs >= plan.settings.sessionMinutes * 60_000;
}

function emit(plan: SessionPlan, state: SessionState, action: Omit<Action, "progress">): Transition {
  const full: Action = { ...action, progress: progress(plan, state) };
  return { state: { ...state, lastAction: full }, action: full };
}

function praiseClip(plan: SessionPlan, state: SessionState): ClipRef {
  return { type: "system", key: "praise", variant: state.praiseCount % plan.settings.praiseVariants };
}

function toClose(plan: SessionPlan, state: SessionState, reason: EndReason, lead: ClipRef[] = []): Transition {
  const next: SessionState = { ...state, phase: "CLOSE", current: undefined, endReason: reason };
  return emit(plan, next, { kind: "play_only", clips: [...lead, { type: "system", key: "close" }] });
}

function startProbeOrPractice(plan: SessionPlan, state: SessionState): Transition {
  if (plan.probeItemIds.length > 0) {
    const next: SessionState = { ...state, phase: "PROBE", probeIndex: 0 };
    const itemId = plan.probeItemIds[0];
    return emit(plan, next, {
      kind: "play_and_listen",
      clips: [{ type: "system", key: "probe_intro" }, { type: "item", itemId, cue: "prompt" }],
      listen: listenSpec(plan.settings),
      itemId,
      cue: "prompt",
    });
  }
  return nextPracticeItem(plan, { ...state, phase: "ITEM" }, [{ type: "system", key: "practice_intro" }]);
}

function nextPracticeItem(plan: SessionPlan, state: SessionState, lead: ClipRef[], atMs?: number): Transition {
  if (atMs !== undefined && timeUp(plan, state, atMs)) return toClose(plan, state, "time", lead);
  if (state.queue.length === 0) {
    return toClose(plan, state, state.shortened ? "shortened" : "completed", lead);
  }
  const [entry, ...rest] = state.queue;
  const ladder = cueLadder(plan.settings.cueMode);
  const level = entry.startLevel;
  const next: SessionState = {
    ...state,
    phase: "ITEM",
    queue: rest,
    current: { entry, level, attempts: 0, uncertain: 0 },
  };
  return emit(plan, next, {
    kind: "play_and_listen",
    clips: [...lead, { type: "item", itemId: entry.itemId, cue: ladder[level] }],
    listen: listenSpec(plan.settings),
    itemId: entry.itemId,
    cue: ladder[level],
  });
}

/** Insert a re-exposure two places later so the same word is never back to back. */
function requeue(queue: QueueEntry[], entry: QueueEntry): QueueEntry[] {
  const pos = Math.min(2, queue.length);
  return [...queue.slice(0, pos), entry, ...queue.slice(pos)];
}

function finishItem(
  plan: SessionPlan,
  state: SessionState,
  correct: boolean,
  atMs: number,
  noResponse: boolean,
): Transition {
  const cur = state.current!;
  const ladder = cueLadder(plan.settings.cueMode);
  const endedAt = ladder[cur.level];
  // Correct at the model step is a repetition, not retrieval.
  const retrieved = correct && endedAt !== "model";
  const independent = retrieved && cur.level === cur.entry.startLevel && endedAt === "prompt";
  const outcome: ItemOutcome = {
    itemId: cur.entry.itemId,
    phase: "practice",
    endedAt,
    retrieved,
    independent,
    attempts: cur.attempts,
    uncertainCount: cur.uncertain,
    noResponse,
  };

  let queue = state.queue;
  const increasing = plan.settings.cueMode === "increasing";
  if (increasing && !retrieved && cur.entry.exposure === 0) {
    // One spaced re-exposure of a word failed earlier in the session.
    queue = requeue(queue, { itemId: cur.entry.itemId, startLevel: 0, exposure: 1 });
  }
  if (!increasing && correct && cur.level < ladder.length - 1 && cur.entry.exposure < 2) {
    // Decreasing mode: fade help on the next exposure.
    queue = requeue(queue, { itemId: cur.entry.itemId, startLevel: cur.level + 1, exposure: cur.entry.exposure + 1 });
  }

  // Increasing mode: a miss = the word was not retrieved before the model step.
  // Decreasing mode: a miss = the patient could not say the word even with the cue given.
  const missed = increasing ? !retrieved : !correct;
  let missesInRow = missed ? state.missesInRow + 1 : 0;
  let shortened = state.shortened;
  const lead: ClipRef[] = [];

  if (correct) {
    lead.push(praiseClip(plan, state));
  } else {
    lead.push({ type: "system", key: "effort" });
  }

  if (missesInRow >= plan.settings.maxMissesInRow && !shortened) {
    shortened = true;
    missesInRow = 0;
    lead.push({ type: "system", key: "easier" });
    // Keep only items with the easiest history: re-exposures first dropped, then cap.
    queue = queue.filter((q) => q.exposure === 0).slice(0, plan.settings.itemsAfterShorten);
  }

  const next: SessionState = {
    ...state,
    current: undefined,
    queue,
    missesInRow,
    shortened,
    praiseCount: correct ? state.praiseCount + 1 : state.praiseCount,
    outcomes: [...state.outcomes, outcome],
  };
  return nextPracticeItem(plan, next, lead, atMs);
}

function handleItem(plan: SessionPlan, state: SessionState, event: SessionEvent): Transition {
  const cur = state.current;
  if (!cur) return nextPracticeItem(plan, state, [], event.atMs);
  const ladder = cueLadder(plan.settings.cueMode);
  const atModel = ladder[cur.level] === "model";

  if (event.type === "skip") return finishItem(plan, state, false, event.atMs, false);

  if (event.type === "attempt" || event.type === "silence_timeout") {
    const isAttempt = event.type === "attempt";
    const score: LiveScore | null = isAttempt ? event.score : null;
    const updated = {
      ...cur,
      attempts: cur.attempts + (isAttempt ? 1 : 0),
      uncertain: cur.uncertain + (score === "uncertain" ? 1 : 0),
    };
    const s1: SessionState = { ...state, current: updated };

    if (score === "correct") return finishItem(plan, s1, true, event.atMs, false);

    const noResponse = updated.attempts === 0;
    let nextLevel: number;
    if (plan.settings.cueMode === "increasing") {
      if (atModel) return finishItem(plan, s1, false, event.atMs, noResponse);
      nextLevel = cur.level + 1;
    } else {
      // Decreasing mode: a miss means go back to the most help (model); a miss at the model ends the item.
      if (cur.level === 0) return finishItem(plan, s1, false, event.atMs, noResponse);
      nextLevel = 0;
    }
    const s2: SessionState = { ...s1, current: { ...updated, level: nextLevel } };
    const cue = ladder[nextLevel];
    return emit(plan, s2, {
      kind: "play_and_listen",
      clips: [{ type: "item", itemId: cur.entry.itemId, cue }],
      listen: listenSpec(plan.settings),
      itemId: cur.entry.itemId,
      cue,
    });
  }

  // Ignore other events in this phase: repeat the last action.
  return { state, action: state.lastAction ?? nextPracticeItem(plan, state, []).action };
}

function handleProbe(plan: SessionPlan, state: SessionState, event: SessionEvent): Transition {
  if (event.type !== "attempt" && event.type !== "silence_timeout" && event.type !== "skip") {
    return { state, action: state.lastAction! };
  }
  const itemId = plan.probeItemIds[state.probeIndex];
  const correct = event.type === "attempt" && event.score === "correct";
  const outcome: ItemOutcome = {
    itemId,
    phase: "probe",
    endedAt: "prompt",
    retrieved: correct,
    independent: correct,
    attempts: event.type === "attempt" ? 1 : 0,
    uncertainCount: event.type === "attempt" && event.score === "uncertain" ? 1 : 0,
    noResponse: event.type !== "attempt",
  };
  const nextIndex = state.probeIndex + 1;
  const s1: SessionState = { ...state, probeIndex: nextIndex, outcomes: [...state.outcomes, outcome] };
  const thanks: ClipRef = { type: "system", key: "probe_thanks" };

  if (nextIndex < plan.probeItemIds.length) {
    const nextId = plan.probeItemIds[nextIndex];
    return emit(plan, s1, {
      kind: "play_and_listen",
      clips: [thanks, { type: "item", itemId: nextId, cue: "prompt" }],
      listen: listenSpec(plan.settings),
      itemId: nextId,
      cue: "prompt",
    });
  }
  return nextPracticeItem(plan, { ...s1, phase: "ITEM" }, [thanks, { type: "system", key: "practice_intro" }], event.atMs);
}

// ---------- main reducer ----------

export function transition(plan: SessionPlan, state: SessionState, event: SessionEvent): Transition {
  // Safety overrides everything, from any phase.
  if (event.type === "safety") {
    const next: SessionState = { ...state, phase: "SAFETY_EXIT", current: undefined, endReason: "safety" };
    return emit(plan, next, { kind: "safety_exit", clips: [{ type: "system", key: "safety_exit" }] });
  }
  if (state.phase === "SAFETY_EXIT" || state.phase === "DONE") {
    return { state, action: state.lastAction ?? { kind: "end", clips: [], progress: progress(plan, state) } };
  }
  if (event.type === "stop") {
    return toClose(plan, state, "patient_stop");
  }
  if (event.type === "pause" && state.phase !== "PAUSED") {
    const next: SessionState = { ...state, phase: "PAUSED", pausedFrom: state.phase as Exclude<Phase, "PAUSED"> };
    return { state: next, action: { kind: "play_only", clips: [{ type: "system", key: "paused" }], progress: progress(plan, state) } };
  }

  switch (state.phase) {
    case "PAUSED": {
      if (event.type !== "resume") {
        return { state, action: { kind: "play_only", clips: [], progress: progress(plan, state) } };
      }
      const restored: SessionState = { ...state, phase: state.pausedFrom ?? "ITEM", pausedFrom: undefined };
      return { state: restored, action: state.lastAction ?? nextPracticeItem(plan, restored, []).action };
    }

    case "GREETING": {
      if (event.type === "start") {
        return emit(plan, state, {
          kind: "ask_yes_no",
          clips: [{ type: "system", key: "hello" }, { type: "system", key: "greeting" }],
        });
      }
      if (event.type === "yes") {
        return emit(plan, { ...state, phase: "SAFETY_CHECK" }, {
          kind: "ask_yes_no",
          clips: [{ type: "system", key: "safety_check" }],
        });
      }
      if (event.type === "no") {
        const next: SessionState = { ...state, phase: "CLOSE", endReason: "declined" };
        return emit(plan, next, { kind: "play_only", clips: [{ type: "system", key: "goodbye" }] });
      }
      break;
    }

    case "SAFETY_CHECK": {
      // The question is "Any new problem today?": yes means a possible new symptom.
      if (event.type === "yes") return transition(plan, state, { type: "safety", atMs: event.atMs });
      if (event.type === "no") {
        return emit(plan, { ...state, phase: "WARMUP" }, {
          kind: "play_and_listen",
          clips: [{ type: "system", key: "warmup" }],
          listen: { ...listenSpec(plan.settings), maxAttemptMs: 20000 },
        });
      }
      break;
    }

    case "WARMUP": {
      if (event.type === "attempt" || event.type === "silence_timeout" || event.type === "skip") {
        return startProbeOrPractice(plan, state);
      }
      break;
    }

    case "PROBE":
      return handleProbe(plan, state, event);

    case "ITEM":
      return handleItem(plan, state, event);

    case "CLOSE": {
      if (event.type === "played") {
        const next: SessionState = { ...state, phase: "DONE" };
        return emit(plan, next, { kind: "end", clips: [] });
      }
      break;
    }
  }

  return { state, action: state.lastAction ?? { kind: "end", clips: [], progress: progress(plan, state) } };
}

// ---------- session summary ----------

export interface SessionSummary {
  practiced: number;
  retrieved: number;
  independent: number;
  probeTotal: number;
  probeCorrect: number;
  uncertain: number;
}

export function summarise(state: SessionState): SessionSummary {
  const practice = state.outcomes.filter((o) => o.phase === "practice");
  const probe = state.outcomes.filter((o) => o.phase === "probe");
  return {
    practiced: practice.length,
    retrieved: practice.filter((o) => o.retrieved).length,
    independent: practice.filter((o) => o.independent).length,
    probeTotal: probe.length,
    probeCorrect: probe.filter((o) => o.retrieved).length,
    uncertain: state.outcomes.reduce((n, o) => n + o.uncertainCount, 0),
  };
}
