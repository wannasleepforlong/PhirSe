import { NextResponse } from "next/server";
import { adminDb } from "@/lib/db/admin";
import { createProfile, deleteProfile } from "@/lib/profile/service";

export const runtime = "nodejs";

// One-click "try it": a throwaway practice with a 3-word session, removed after a day.
// Kept off the device's remembered profile so it never replaces a family's real practice.

const WINDOW_MS = 60 * 60 * 1000;
const PER_WINDOW = 6;
const hits = new Map<string, number[]>();

function allowed(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= PER_WINDOW) return false;
  recent.push(now);
  hits.set(ip, recent);
  return true;
}

async function removeExpiredDemos() {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data } = await adminDb()
    .from("patient")
    .select("id")
    .eq("is_demo", true)
    .eq("settings->>try_demo", "true")
    .lt("created_at", cutoff)
    .limit(10);
  await Promise.all((data ?? []).map((p) => deleteProfile(p.id).catch(() => undefined)));
}

export async function POST(req: Request) {
  const origin = new URL(req.url).origin;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!allowed(ip)) return NextResponse.redirect(new URL("/?demo=busy", origin), 303);
  void removeExpiredDemos();
  try {
    const { token } = await createProfile({
      displayName: "दोस्त",
      honorific: "",
      relation: "demo",
      familyPhone: null,
      storeAudio: true,
      tryDemo: true,
    });
    return NextResponse.redirect(new URL(`/p/${token}`, origin), 303);
  } catch (e) {
    console.error("demo create failed", e);
    return NextResponse.redirect(new URL("/?demo=error", origin), 303);
  }
}
