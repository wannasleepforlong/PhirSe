import { NextResponse } from "next/server";
import { currentSlp, slpDb } from "@/lib/db/server";
import { cachedTextClip, voiceFromSettings } from "@/lib/session/clips";

export const runtime = "nodejs";

// Voice preview for the SLP word editor. Uses the patient's voice settings and the shared clip
// cache, so a previewed cue is the same file the session will play: TTS is paid for once.
export async function POST(req: Request) {
  const me = await currentSlp();
  if (!me) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { text?: string; patientId?: string } | null;
  const text = (body?.text ?? "").trim();
  if (!text || text.length > 300) return NextResponse.json({ error: "text required (max 300 chars)" }, { status: 400 });
  if (!body?.patientId) return NextResponse.json({ error: "patientId required" }, { status: 400 });

  // RLS: only returns the patient if this SLP owns them.
  const db = await slpDb();
  const { data: patient } = await db.from("patient").select("id, settings").eq("id", body.patientId).maybeSingle();
  if (!patient) return NextResponse.json({ error: "patient not found" }, { status: 404 });
  try {
    const clip = await cachedTextClip(text, voiceFromSettings(patient.settings as Record<string, unknown>), patient.id);
    return NextResponse.json(clip);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
