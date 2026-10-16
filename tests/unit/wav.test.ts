import { describe, expect, it } from "vitest";
import { durationMs, encodeWav } from "@/lib/audio/wav";

describe("encodeWav", () => {
  it("writes a valid 16 kHz mono 16-bit header and clamps samples", () => {
    const samples = new Float32Array([0, 1, -1, 2, -2]);
    const buf = encodeWav(samples, 16000);
    const v = new DataView(buf);
    const str = (o: number, n: number) => String.fromCharCode(...new Uint8Array(buf, o, n));
    expect(str(0, 4)).toBe("RIFF");
    expect(str(8, 4)).toBe("WAVE");
    expect(v.getUint16(22, true)).toBe(1);
    expect(v.getUint32(24, true)).toBe(16000);
    expect(v.getUint16(34, true)).toBe(16);
    expect(v.getUint32(40, true)).toBe(10);
    expect(buf.byteLength).toBe(54);
    expect(v.getInt16(46, true)).toBe(0x7fff);
    expect(v.getInt16(48, true)).toBe(-0x8000);
    expect(v.getInt16(50, true)).toBe(0x7fff); // clamped
  });

  it("computes duration", () => {
    expect(durationMs(new Float32Array(16000))).toBe(1000);
  });
});
