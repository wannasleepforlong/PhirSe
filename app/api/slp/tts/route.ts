import { NextResponse } from "next/server";
import { currentSlp } from "@/lib/db/server";
import { synthesize } from "@/lib/speech/sarvamTts";

export const runtime = "nodejs";

// Voice preview for the SLP word editor.
export async function POST(req: Request) {
  const me = await currentSlp();
  if (!me) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { text?: string; speaker?: string; pace?: number } | null;
  const text = (body?.text ?? "").trim();
  if (!text || text.length > 300) return NextResponse.json({ error: "text required (max 300 chars)" }, { status: 400 });
  try {
    const out = await synthesize({ text, speaker: body?.speaker, pace: body?.pace });
    return new Response(Buffer.from(out.audio), { headers: { "content-type": out.contentType } });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
