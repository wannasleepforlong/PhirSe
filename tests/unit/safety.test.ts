import { describe, expect, it } from "vitest";
import { scanSafety, isEmergency } from "@/lib/engine/safety";

describe("scanSafety", () => {
  it("detects BE-FAST signs in Hindi", () => {
    const hits = scanSafety("आज मेरा हाथ काम नहीं कर रहा");
    expect(hits[0].category).toBe("befast");
    expect(isEmergency(hits[0])).toBe(true);
  });

  it("detects signs with nukta spelling variants", () => {
    expect(scanSafety("बहुत कमज़ोरी है")[0]?.category).toBe("befast");
    expect(scanSafety("बहुत कमजोरी है")[0]?.category).toBe("befast");
  });

  it("detects Romanised and English phrases", () => {
    expect(scanSafety("chakkar aa raha hai")[0]?.category).toBe("befast");
    expect(scanSafety("I have chest pain")[0]?.category).toBe("chest_pain");
  });

  it("detects distress", () => {
    const hits = scanSafety("अब जीना नहीं है");
    expect(hits[0].category).toBe("distress");
    expect(isEmergency(hits[0])).toBe(false);
  });

  it("scans both transcripts", () => {
    expect(scanSafety("कप", "चक्कर")[0]?.category).toBe("befast");
  });

  it("orders emergencies before stop requests", () => {
    const hits = scanSafety("बस करो चक्कर आ रहा है");
    expect(hits.map((h) => h.category)).toEqual(["befast", "stop"]);
  });

  it("returns nothing for normal answers", () => {
    expect(scanSafety("कप")).toEqual([]);
    expect(scanSafety(null, undefined)).toEqual([]);
  });
});
