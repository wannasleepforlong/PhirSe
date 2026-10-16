// The speech spike spends API credits. Allow it in development, or with SPIKE_ACCESS_KEY in production.
export function spikeAllowed(key: string | null | undefined): boolean {
  const expected = process.env.SPIKE_ACCESS_KEY;
  if (expected) return key === expected;
  return process.env.NODE_ENV !== "production";
}
