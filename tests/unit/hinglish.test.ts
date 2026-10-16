import { describe, expect, it } from "vitest";
import { toHinglish } from "@/lib/i18n/hinglish";

describe("toHinglish", () => {
  it("renders common words the way people type them", () => {
    expect(toHinglish("चाय")).toBe("Chai");
    expect(toHinglish("पानी")).toBe("Paani");
    expect(toHinglish("कप")).toBe("Kap");
    expect(toHinglish("दरवाज़ा")).toBe("Darvaaza");
    expect(toHinglish("घड़ी")).toBe("Ghadi");
  });

  it("drops medial schwa in V C(a) C V", () => {
    expect(toHinglish("किसमें")).toBe("Kismein");
    expect(toHinglish("कमज़ोरी")).toBe("Kamzori");
  });

  it("uses everyday spellings for common words", () => {
    expect(toHinglish("यह रसोई में होता है")).toBe("Yeh rasoi mein hota hai");
    expect(toHinglish("पकड़ते")).toBe("Pakadte");
  });

  it("keeps punctuation, Latin words and capitalises sentences", () => {
    expect(toHinglish("नमस्ते! मैं AI साथी हूँ।")).toBe("Namaste! Main AI saathi hoon.");
    expect(toHinglish("सुबह हम चाय किसमें पीते हैं?")).toBe("Subah hum chai kismein peete hain?");
  });
});
