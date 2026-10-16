import { NextResponse } from "next/server";
import { spikeAllowed } from "@/lib/spikeAccess";
import { cachedTextClip } from "@/lib/session/clips";

export const runtime = "nodejs";

// Spike page voice test. Goes through the shared clip cache so replaying a line costs nothing.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | { key?: string; text?: string; speaker?: string; pace?: number }
    | null;
  if (!body || !spikeAllowed(body.key)) return NextResponse.json({ error: "not allowed" }, { status: 403 });
  const text = (body.text ?? "").trim();
  if (!text || text.length > 500) return NextResponse.json({ error: "text required (max 500 chars)" }, { status: 400 });
  const pace = Math.round(Math.min(2, Math.max(0.5, body.pace ?? 0.8)) * 100) / 100;
  try {
    const clip = await cachedTextClip(text, { speaker: body.speaker ?? "priya", pace }, null);
    return NextResponse.json(clip);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
