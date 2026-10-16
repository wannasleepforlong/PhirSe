import { describe, expect, it } from "vitest";
import {
  interleave,
  isProbeDay,
  selectPracticeWords,
  selectProbeWords,
  updateBoxes,
  type ScheduledWord,
} from "@/lib/engine/scheduler";
import type { ItemOutcome } from "@/lib/engine/stateMachine";

const w = (id: string, box = 1, set: ScheduledWord["set"] = "treated", streak = 0): ScheduledWord => ({
  id, set, box, independentStreak: streak, graduated: false,
});

const outcome = (itemId: string, retrieved: boolean, independent: boolean): ItemOutcome => ({
  itemId, phase: "practice", endedAt: independent ? "prompt" : retrieved ? "semantic" : "model",
  retrieved, independent, attempts: 1, uncertainCount: 0, noResponse: false,
});

describe("selectPracticeWords", () => {
  it("never selects untreated or reserve words", () => {
    const words = [w("a"), w("u", 1, "untreated"), w("r", 1, "reserve")];
    expect(selectPracticeWords(words, 1, 10)).toEqual(["a"]);
  });

  it("box 2 words are due every 2nd session, box 4 never in practice", () => {
    const words = [w("b2", 2), w("b4", 4)];
    expect(selectPracticeWords(words, 1, 1)).toEqual(["b2"]);
    // session 2: b2 not due, list filled from not-due words below box 4
    expect(selectPracticeWords(words, 2, 1)).toEqual(["b2"]);
    expect(selectPracticeWords([w("b4", 4)], 1, 5)).toEqual([]);
  });

  it("caps at maxItems", () => {
    const words = Array.from({ length: 20 }, (_, i) => w(`w${i}`));
    expect(selectPracticeWords(words, 1, 12)).toHaveLength(12);
  });
});

describe("interleave", () => {
  it("is deterministic per seed and a permutation", () => {
    const ids = ["a", "b", "c", "d", "e"];
    expect(interleave(ids, 3)).toEqual(interleave(ids, 3));
    expect([...interleave(ids, 3)].sort()).toEqual(ids);
  });
});

describe("selectProbeWords", () => {
  it("alternates treated and untreated", () => {
    const words = [w("t1"), w("t2"), w("u1", 1, "untreated"), w("u2", 1, "untreated")];
    const probe = selectProbeWords(words, 2, 1);
    expect(probe).toHaveLength(4);
    expect(probe.filter((id) => id.startsWith("t"))).toHaveLength(2);
    expect(probe[0].startsWith("t")).toBe(true);
    expect(probe[1].startsWith("u")).toBe(true);
  });
});

describe("updateBoxes", () => {
  it("independent -> up a box; cued -> stay; model -> box 1", () => {
    const words = [w("a", 1), w("b", 2), w("c", 3)];
    const updates = updateBoxes(words, [outcome("a", true, true), outcome("b", true, false), outcome("c", false, false)]);
    expect(updates).toEqual([
      { id: "a", box: 2, independentStreak: 1, proposeGraduation: false },
      { id: "b", box: 2, independentStreak: 0, proposeGraduation: false },
      { id: "c", box: 1, independentStreak: 0, proposeGraduation: false },
    ]);
  });

  it("uses the first exposure only and proposes graduation after the streak", () => {
    const words = [w("a", 3, "treated", 2)];
    const updates = updateBoxes(words, [outcome("a", true, true), outcome("a", false, false)]);
    expect(updates[0]).toMatchObject({ box: 4, independentStreak: 3, proposeGraduation: true });
  });
});

describe("isProbeDay", () => {
  it("defaults to Mon/Wed/Fri", () => {
    expect(isProbeDay(new Date("2026-10-19T10:00:00"))).toBe(true); // Monday
    expect(isProbeDay(new Date("2026-10-20T10:00:00"))).toBe(false); // Tuesday
  });
});
