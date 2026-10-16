import { describe, expect, it } from "vitest";
import { scoreAttempt, matchTranscript, isPassRequest } from "@/lib/engine/scorer";

const CUP = ["कप", "kap", "cup", "प्याला"];
const s = (transcriptA: string | null, transcriptB: string | null = null, speechDetected = true) =>
  scoreAttempt({ acceptedForms: CUP, transcriptA, transcriptB, speechDetected });

describe("scoreAttempt decision table", () => {
  it("A exact -> correct", () => {
    expect(s("कप")).toMatchObject({ score: "correct", reason: "A_EXACT", selfCorrected: false });
  });

  it("accepts English equivalent and synonyms", () => {
    expect(s("cup").score).toBe("correct");
    expect(s("प्याला").score).toBe("correct");
  });

  it("target after another word -> correct, self-corrected", () => {
    expect(s("बिस्तर नहीं कप")).toMatchObject({ score: "correct", reason: "A_SELF_CORRECT", selfCorrected: true });
  });

  it("phonemic near-miss in A, exact in B -> uncertain (never correct)", () => {
    expect(s("कब", "कप")).toMatchObject({ score: "uncertain", reason: "A_CLOSE_B_EXACT" });
  });

  it("target heard only when biased -> uncertain B_ONLY", () => {
    expect(s("बिस्तर", "कप")).toMatchObject({ score: "uncertain", reason: "B_ONLY" });
  });

  it("close match alone -> uncertain A_CLOSE", () => {
    expect(s("कब", "कब")).toMatchObject({ score: "uncertain", reason: "A_CLOSE" });
  });

  it("unrelated word -> not_yet", () => {
    expect(s("बिस्तर", "बिस्तर")).toMatchObject({ score: "not_yet", reason: "NO_MATCH" });
  });

  it("pass request -> not_yet with flag", () => {
    expect(s("पता नहीं")).toMatchObject({ score: "not_yet", reason: "PASS_REQUEST", passRequested: true });
  });

  it("empty transcript but speech heard -> uncertain", () => {
    expect(s("", null, true)).toMatchObject({ score: "uncertain", reason: "EMPTY_STT" });
  });

  it("no speech -> not_yet", () => {
    expect(s(null, null, false)).toMatchObject({ score: "not_yet", reason: "NO_SPEECH" });
  });
});

describe("matchTranscript", () => {
  it("matches two-word targets", () => {
    const r = matchTranscript("यह चाय की पत्ती है", ["चाय की पत्ती"]);
    expect(r.kind).toBe("exact");
    expect(r.position).toBe(1);
  });

  it("matches Roman spelling variants exactly", () => {
    expect(matchTranscript("chai", ["चाय"]).kind).toBe("exact");
  });
});

describe("isPassRequest", () => {
  it("detects Hindi and Roman phrases", () => {
    expect(isPassRequest("मुझे पता नहीं")).toBe(true);
    expect(isPassRequest("nahi aata")).toBe(true);
    expect(isPassRequest("कप")).toBe(false);
  });
});
