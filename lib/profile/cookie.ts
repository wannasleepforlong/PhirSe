import "server-only";
import { cookies } from "next/headers";
import { looksLikeToken } from "@/lib/auth/patientToken";

// Remembers this device's practice profile so the home page can offer "Continue practice".
export const PROFILE_COOKIE = "phirse_profile";

export async function rememberProfile(token: string) {
  (await cookies()).set(PROFILE_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function rememberedToken(): Promise<string | null> {
  const t = (await cookies()).get(PROFILE_COOKIE)?.value;
  return looksLikeToken(t) ? t : null;
}

export async function forgetProfile() {
  (await cookies()).delete(PROFILE_COOKIE);
}
