"use server";

import { createProfile, ProfileError } from "@/lib/profile/service";
import { rememberProfile } from "@/lib/profile/cookie";

export interface StartInput {
  displayName: string;
  honorific: string;
  relation: string | null;
  familyPhone: string | null;
  storeAudio: boolean;
  acknowledged: boolean;
}

export type StartResult = { ok: true; token: string } | { ok: false; error: string };

export async function startPractice(input: StartInput): Promise<StartResult> {
  if (!input.acknowledged) return { ok: false, error: "Please tick the box to confirm you understand what PhirSe is." };
  if (input.familyPhone && !/^[+\d][\d\s-]{6,18}$/.test(input.familyPhone.trim())) {
    return { ok: false, error: "That phone number does not look right. Use digits only, for example 98XXXXXXXX." };
  }
  try {
    const { token } = await createProfile(input);
    await rememberProfile(token);
    return { ok: true, token };
  } catch (e) {
    if (e instanceof ProfileError && e.status < 500) return { ok: false, error: e.message };
    console.error("profile create failed", e);
    return { ok: false, error: "Could not create the practice. Check your connection and try again." };
  }
}
