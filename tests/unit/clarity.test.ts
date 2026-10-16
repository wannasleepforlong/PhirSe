import { describe, expect, it } from "vitest";
import { claritySeries, languageLabel, parseClarity, recordingTips } from "@/lib/engine/clarity";

const c = (clarity: number, flags: string[] = [], verdict = "match") => ({ clarity, flags, verdict, word_match: 1 });

describe("parseClarity", () => {
  it("accepts verifier output and rejects junk", () => {
    expect(parseClarity(c(80))?.clarity).toBe(80);
    expect(parseClarity(null)).toBeNull();
    expect(parseClarity({ foo: 1 })).toBeNull();
  });
});

describe("claritySeries", () => {
  it("averages per session, skips warm-up, unscored and silent answers, keeps session order", () => {
    const series = claritySeries(
      [
        { session_id: "s2", phase: "practice", clarity: c(90) },
        { session_id: "s1", phase: "practice", clarity: c(60) },
        { session_id: "s1", phase: "practice", clarity: c(70) },
        { session_id: "s1", phase: "warmup", clarity: c(10) },
        { session_id: "s1", phase: "practice", clarity: null },
        { session_id: "s1", phase: "probe", clarity: c(0, ["no_speech"], "no_speech") },
      ],
      ["s1", "s2", "s3"],
    );
    expect(series).toEqual([
      { sessionId: "s1", clarity: 65, scored: 2 },
      { sessionId: "s2", clarity: 90, scored: 1 },
    ]);
  });
});

describe("recordingTips", () => {
  it("needs a repeated problem before suggesting a fix", () => {
    expect(recordingTips([{ clarity: c(50, ["noisy"]) }, { clarity: c(50) }])).toEqual([]);
    const many = [
      ...Array.from({ length: 3 }, () => ({ clarity: c(40, ["too_quiet", "noisy"]) })),
      ...Array.from({ length: 5 }, () => ({ clarity: c(80) })),
    ];
    expect(recordingTips(many)).toEqual(["too_quiet", "noisy"]);
  });
});

describe("languageLabel", () => {
  it("names the language with confidence", () => {
    expect(languageLabel({ language: "hi-IN", language_probability: 0.981 })).toBe("Hindi, 98%");
    expect(languageLabel({ language: "xx-IN", language_probability: null })).toBe("xx-IN");
    expect(languageLabel({ language: null, language_probability: 0.5 })).toBeNull();
  });
});
