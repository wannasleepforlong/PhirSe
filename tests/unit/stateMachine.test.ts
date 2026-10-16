import { describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS,
  initialState,
  summarise,
  transition,
  type SessionEvent,
  type SessionPlan,
  type SessionState,
  type Transition,
} from "@/lib/engine/stateMachine";

function plan(overrides: Partial<SessionPlan> = {}): SessionPlan {
  return {
    practiceItemIds: ["cup", "tea", "door"],
    probeItemIds: [],
    settings: { ...DEFAULT_SETTINGS },
    ...overrides,
  };
}

type EventInput = SessionEvent extends infer E ? (E extends SessionEvent ? Omit<E, "atMs"> & { atMs?: number } : never) : never;

function run(p: SessionPlan, events: EventInput[]): Transition {
  let state: SessionState = initialState(p, 0);
  let t: Transition | undefined;
  for (const e of events) {
    t = transition(p, state, { atMs: 1000, ...e } as SessionEvent);
    state = t.state;
  }
  return t!;
}

const toPractice: EventInput[] = [{ type: "start" }, { type: "yes" }, { type: "no" }, { type: "silence_timeout" }];

describe("session opening", () => {
  it("greets with AI disclosure, then asks the safety question, then warm-up", () => {
    const p = plan();
    let t = run(p, [{ type: "start" }]);
    expect(t.action).toMatchObject({ kind: "ask_yes_no", clips: [{ key: "greeting" }] });
    t = run(p, [{ type: "start" }, { type: "yes" }]);
    expect(t.state.phase).toBe("SAFETY_CHECK");
    t = run(p, [{ type: "start" }, { type: "yes" }, { type: "no" }]);
    expect(t.state.phase).toBe("WARMUP");
  });

  it("declining to start ends politely", () => {
    const t = run(plan(), [{ type: "start" }, { type: "no" }]);
    expect(t.state).toMatchObject({ phase: "CLOSE", endReason: "declined" });
  });

  it("yes to 'any new problem' is a safety exit", () => {
    const t = run(plan(), [{ type: "start" }, { type: "yes" }, { type: "yes" }]);
    expect(t.action.kind).toBe("safety_exit");
    expect(t.state.endReason).toBe("safety");
  });
});

describe("increasing cue ladder", () => {
  it("first item starts at the prompt", () => {
    const t = run(plan(), [...toPractice]);
    expect(t.state.phase).toBe("ITEM");
    expect(t.action).toMatchObject({ kind: "play_and_listen", itemId: "cup", cue: "prompt" });
  });

  it("correct at prompt -> praise + next item, independent", () => {
    const t = run(plan(), [...toPractice, { type: "attempt", score: "correct" }]);
    expect(t.action.clips[0]).toMatchObject({ type: "system", key: "praise" });
    expect(t.action).toMatchObject({ itemId: "tea", cue: "prompt" });
    expect(t.state.outcomes[0]).toMatchObject({ itemId: "cup", retrieved: true, independent: true });
  });

  it("not_yet and silence climb prompt -> semantic -> phonemic -> model", () => {
    const p = plan();
    expect(run(p, [...toPractice, { type: "attempt", score: "not_yet" }]).action.cue).toBe("semantic");
    expect(run(p, [...toPractice, { type: "attempt", score: "uncertain" }, { type: "silence_timeout" }]).action.cue).toBe("phonemic");
    const t = run(p, [...toPractice, { type: "silence_timeout" }, { type: "silence_timeout" }, { type: "silence_timeout" }]);
    expect(t.action.cue).toBe("model");
  });

  it("correct after a cue counts as retrieved but not independent", () => {
    const t = run(plan(), [...toPractice, { type: "attempt", score: "not_yet" }, { type: "attempt", score: "correct" }]);
    expect(t.state.outcomes[0]).toMatchObject({ endedAt: "semantic", retrieved: true, independent: false });
  });

  it("correct repetition at the model step is praised but not retrieval; word is re-queued once, not back to back", () => {
    const t = run(plan(), [
      ...toPractice,
      { type: "silence_timeout" }, { type: "silence_timeout" }, { type: "silence_timeout" },
      { type: "attempt", score: "correct" },
    ]);
    expect(t.state.outcomes[0]).toMatchObject({ endedAt: "model", retrieved: false });
    expect(t.action.clips[0]).toMatchObject({ key: "praise" });
    expect(t.action.itemId).toBe("tea");
    expect(t.state.queue.map((q) => q.itemId)).toEqual(["door", "cup"]);
  });

  it("skip finishes the item", () => {
    const t = run(plan(), [...toPractice, { type: "skip" }]);
    expect(t.action.itemId).toBe("tea");
    expect(t.state.outcomes[0].retrieved).toBe(false);
  });
});

describe("misses in a row", () => {
  it("shortens the session after 3 misses", () => {
    const p = plan({ practiceItemIds: ["a", "b", "c", "d", "e", "f", "g"] });
    const miss: EventInput[] = [{ type: "skip" }];
    const t = run(p, [...toPractice, ...miss, ...miss, ...miss]);
    expect(t.state.shortened).toBe(true);
    expect(t.action.clips.some((c) => c.type === "system" && c.key === "easier")).toBe(true);
    // current item + 1 queued = itemsAfterShorten (2)
    expect(t.state.queue.length + (t.state.current ? 1 : 0)).toBe(2);
  });
});

describe("decreasing cue mode", () => {
  it("starts at the model and fades help on the next exposure", () => {
    const p = plan({ settings: { ...DEFAULT_SETTINGS, cueMode: "decreasing" } });
    let t = run(p, [...toPractice]);
    expect(t.action.cue).toBe("model");
    t = run(p, [...toPractice, { type: "attempt", score: "correct" }]);
    const requeued = t.state.queue.find((q) => q.itemId === "cup");
    expect(requeued).toMatchObject({ startLevel: 1, exposure: 1 });
  });
});

describe("probe", () => {
  it("runs probe items with neutral thanks and no cues, then practice", () => {
    const p = plan({ probeItemIds: ["p1", "p2"] });
    let t = run(p, [...toPractice]);
    expect(t.state.phase).toBe("PROBE");
    expect(t.action.clips[0]).toMatchObject({ key: "probe_intro" });
    t = run(p, [...toPractice, { type: "attempt", score: "not_yet" }]);
    expect(t.action).toMatchObject({ itemId: "p2", cue: "prompt" });
    expect(t.action.clips[0]).toMatchObject({ key: "probe_thanks" });
    t = run(p, [...toPractice, { type: "attempt", score: "not_yet" }, { type: "attempt", score: "correct" }]);
    expect(t.state.phase).toBe("ITEM");
    expect(t.action.itemId).toBe("cup");
    expect(summarise(t.state)).toMatchObject({ probeTotal: 2, probeCorrect: 1 });
  });
});

describe("safety, pause, stop, time", () => {
  it("safety event exits from any phase", () => {
    const t = run(plan(), [...toPractice, { type: "safety" }]);
    expect(t.action.kind).toBe("safety_exit");
    const after = transition(plan(), t.state, { type: "attempt", score: "correct", atMs: 2000 });
    expect(after.action.kind).toBe("safety_exit");
  });

  it("pause and resume replays the current cue", () => {
    const p = plan();
    const before = run(p, [...toPractice]);
    const paused = transition(p, before.state, { type: "pause", atMs: 2000 });
    expect(paused.state.phase).toBe("PAUSED");
    const resumed = transition(p, paused.state, { type: "resume", atMs: 3000 });
    expect(resumed.state.phase).toBe("ITEM");
    expect(resumed.action).toEqual(before.action);
  });

  it("stop closes the session", () => {
    const t = run(plan(), [...toPractice, { type: "stop" }]);
    expect(t.state).toMatchObject({ phase: "CLOSE", endReason: "patient_stop" });
  });

  it("closes when the time budget is used up", () => {
    const p = plan();
    const t = run(p, [...toPractice, { type: "attempt", score: "correct", atMs: 13 * 60_000 }]);
    expect(t.state).toMatchObject({ phase: "CLOSE", endReason: "time" });
  });

  it("completes and ends after the close clip plays", () => {
    const p = plan({ practiceItemIds: ["cup"] });
    let t = run(p, [...toPractice, { type: "attempt", score: "correct" }]);
    expect(t.state).toMatchObject({ phase: "CLOSE", endReason: "completed" });
    t = transition(p, t.state, { type: "played", atMs: 2000 });
    expect(t.state.phase).toBe("DONE");
    expect(t.action.kind).toBe("end");
  });
});
