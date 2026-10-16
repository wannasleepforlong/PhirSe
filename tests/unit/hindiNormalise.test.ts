import { describe, expect, it } from "vitest";
import { devanagariToRoman, normaliseText, phoneticKey, similarity, tokenise } from "@/lib/engine/hindiNormalise";

describe("normaliseText", () => {
  it("folds nukta letters", () => {
    expect(normaliseText("ज़रूर")).toBe(normaliseText("जरूर"));
    expect(normaliseText("फ़ोन")).toBe(normaliseText("फोन"));
    expect(normaliseText("क़लम")).toBe(normaliseText("कलम"));
  });

  it("folds chandrabindu to anusvara", () => {
    expect(normaliseText("हाँ")).toBe(normaliseText("हां"));
  });

  it("strips punctuation and danda, lowercases", () => {
    expect(normaliseText("  कप।  ")).toBe("कप");
    expect(normaliseText("Cup!")).toBe("cup");
  });

  it("tokenises mixed script", () => {
    expect(tokenise("मुझे cup चाहिए।")).toEqual(["मुझे", "cup", "चाहिए"]);
  });
});

describe("devanagariToRoman", () => {
  it("drops word-final schwa", () => {
    expect(devanagariToRoman("कप")).toBe("kap");
    expect(devanagariToRoman("चाय")).toBe("chaay");
  });

  it("handles matras and conjuncts", () => {
    expect(devanagariToRoman("पानी")).toBe("paanii");
    expect(devanagariToRoman("बच्चा")).toBe("bachchaa");
  });
});

describe("phoneticKey", () => {
  it("matches Roman spelling variants of the same word", () => {
    expect(phoneticKey("चाय")).toBe(phoneticKey("chai"));
    expect(phoneticKey("chaay")).toBe(phoneticKey("chay"));
    expect(phoneticKey("पानी")).toBe(phoneticKey("paani"));
    expect(phoneticKey("paani")).toBe(phoneticKey("pani"));
  });

  it("keeps different consonants apart", () => {
    expect(phoneticKey("कप")).not.toBe(phoneticKey("कब"));
  });
});

describe("similarity", () => {
  it("is 1 for identical and lower for different strings", () => {
    expect(similarity("kap", "kap")).toBe(1);
    expect(similarity("kap", "kab")).toBeCloseTo(2 / 3);
  });
});
