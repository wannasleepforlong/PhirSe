// Opaque patient access tokens. Only the peppered SHA-256 hash is stored.

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export function generatePatientToken(): string {
  return randomBytes(24).toString("base64url");
}

export function hashPatientToken(token: string): string {
  const pepper = process.env.TOKEN_PEPPER;
  if (!pepper) throw new Error("TOKEN_PEPPER is not set");
  return createHash("sha256").update(pepper).update(":").update(token).digest("hex");
}

export function tokenMatches(token: string, hash: string): boolean {
  const a = Buffer.from(hashPatientToken(token), "hex");
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Token format check before any DB lookup. */
export function looksLikeToken(token: string | null | undefined): token is string {
  return !!token && /^[A-Za-z0-9_-]{20,64}$/.test(token);
}
