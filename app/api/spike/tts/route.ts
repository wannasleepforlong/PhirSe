import { NextResponse } from "next/server";
import { synthesize } from "@/lib/speech/sarvamTts";
import { spikeAllowed } from "@/lib/spikeAccess";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | { key?: string; text?: string; speaker?: string; pace?: number }
    | null;
  if (!body || !spikeAllowed(body.key)) return NextResponse.json({ error: "not allowed" }, { status: 403 });
  const text = (body.text ?? "").trim();
  if (!text || text.length > 500) return NextResponse.json({ error: "text required (max 500 chars)" }, { status: 400 });
  try {
    const out = await synthesize({ text, speaker: body.speaker, pace: body.pace });
    return new Response(Buffer.from(out.audio), {
      headers: { "content-type": out.contentType, "x-tts-ms": String(out.ms) },
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
