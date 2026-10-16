import { describe, expect, it } from "vitest";
import { agreement, median, probeSeries, weeklyAdherence, type AttemptLike } from "@/lib/engine/metrics";

const a = (live: AttemptLike["live_score"], slp: AttemptLike["slp_label"]): AttemptLike => ({
  live_score: live,
  slp_label: slp,
  phase: "practice",
});

describe("agreement", () => {
  it("computes accuracy, false accepts/rejects and kappa; uncertain reported apart", () => {
    const r = agreement([
      a("correct", "correct"),
      a("correct", "correct"),
      a("not_yet", "incorrect"),
      a("not_yet", "incorrect"),
      a("correct", "incorrect"),
      a("not_yet", "correct"),
      a("uncertain", "correct"),
      a("correct", null),
    ]);
    expect(r).toMatchObject({ labelled: 7, decided: 6, agree: 4, falseAccepts: 1, falseRejects: 1, uncertainLabelled: 1 });
    expect(r.accuracy).toBeCloseTo(4 / 6);
    // po = 0.667, pe = 0.5 -> kappa = 0.333
    expect(r.kappa).toBeCloseTo(1 / 3);
  });

  it("handles no labels", () => {
    expect(agreement([a("correct", null)])).toMatchObject({ labelled: 0, accuracy: null, kappa: null });
  });
});

describe("probeSeries", () => {
  it("splits treated vs untreated per session, preferring SLP labels", () => {
    const rows = [
      { ...a("correct", null), phase: "probe" as const, word_set: "treated" as const, session_id: "s1", created_at: "2026-10-16T10:00:00Z" },
      { ...a("correct", "incorrect"), phase: "probe" as const, word_set: "treated" as const, session_id: "s1", created_at: "2026-10-16T10:01:00Z" },
      { ...a("not_yet", null), phase: "probe" as const, word_set: "untreated" as const, session_id: "s1", created_at: "2026-10-16T10:02:00Z" },
      { ...a("correct", null), phase: "practice" as const, word_set: "treated" as const, session_id: "s1", created_at: "2026-10-16T10:03:00Z" },
    ];
    expect(probeSeries(rows)).toEqual([
      { sessionId: "s1", date: "2026-10-16T10:00:00Z", treated: { correct: 1, total: 2 }, untreated: { correct: 0, total: 1 } },
    ]);
  });
});

describe("weeklyAdherence", () => {
  it("counts the last 7 days only", () => {
    const now = new Date("2026-10-16T12:00:00Z");
    const r = weeklyAdherence(
      [
        { started_at: "2026-10-15T10:00:00Z", minutes_active: 12.4, end_reason: "completed" },
        { started_at: "2026-10-12T10:00:00Z", minutes_active: 8, end_reason: "patient_stop" },
        { started_at: "2026-10-01T10:00:00Z", minutes_active: 15, end_reason: "completed" },
      ],
      now,
    );
    expect(r).toEqual({ sessions: 2, completed: 1, minutes: 20 });
  });
});

describe("median", () => {
  it("works for odd, even and empty", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([])).toBeNull();
  });
});
