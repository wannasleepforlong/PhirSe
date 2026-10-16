import { describe, expect, it } from "vitest";
import { parseYesNo } from "@/lib/engine/yesNo";

describe("parseYesNo", () => {
  it("reads Hindi and English yes", () => {
    expect(parseYesNo("हाँ")).toBe("yes");
    expect(parseYesNo("जी हाँ, शुरू करो")).toBe("yes");
    expect(parseYesNo("haan ji")).toBe("yes");
    expect(parseYesNo("OK")).toBe("yes");
  });

  it("reads no, and no wins over yes words", () => {
    expect(parseYesNo("नहीं")).toBe("no");
    expect(parseYesNo("नहीं, ठीक हूँ")).toBe("no");
    expect(parseYesNo("nahi")).toBe("no");
  });

  it("does not match inside other words", () => {
    expect(parseYesNo("नाम")).toBe("unknown");
    expect(parseYesNo("कप")).toBe("unknown");
    expect(parseYesNo("")).toBe("unknown");
  });
});
