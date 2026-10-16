import { NextResponse } from "next/server";
import { transcribeTwoPass } from "@/lib/speech/sarvamStt";
import { scoreAttempt } from "@/lib/engine/scorer";
import { scanSafety } from "@/lib/engine/safety";
import { spikeAllowed } from "@/lib/spikeAccess";

export const runtime = "nodejs";

const MAX_AUDIO_BYTES = 2_000_000; // ~60 s of 16 kHz mono 16-bit

export async function POST(req: Request) {
  const form = await req.formData();
  if (!spikeAllowed(form.get("key") as string | null)) {
    return NextResponse.json({ error: "not allowed" }, { status: 403 });
  }
  const audio = form.get("audio");
  if (!(audio instanceof Blob) || audio.size === 0 || audio.size > MAX_AUDIO_BYTES) {
    return NextResponse.json({ error: "audio missing or too large" }, { status: 400 });
  }
  let acceptedForms: string[];
  try {
    acceptedForms = JSON.parse(String(form.get("acceptedForms") ?? "[]"));
    if (!Array.isArray(acceptedForms) || acceptedForms.length === 0) throw new Error();
  } catch {
    return NextResponse.json({ error: "acceptedForms must be a non-empty JSON array" }, { status: 400 });
  }
  const speechDetected = form.get("speechDetected") !== "false";

  const started = performance.now();
  const stt = await transcribeTwoPass(audio, acceptedForms);
  const result = scoreAttempt({
    acceptedForms,
    transcriptA: stt.a?.transcript ?? null,
    transcriptB: stt.b?.transcript ?? null,
    speechDetected,
  });
  const safety = scanSafety(stt.a?.transcript, stt.b?.transcript);

  return NextResponse.json({
    transcriptA: stt.a?.transcript ?? null,
    transcriptB: stt.b?.transcript ?? null,
    msA: stt.a?.ms ?? null,
    msB: stt.b?.ms ?? null,
    totalMs: Math.round(performance.now() - started),
    errors: stt.errors,
    score: result.score,
    reason: result.reason,
    selfCorrected: result.selfCorrected,
    passRequested: result.passRequested,
    safety,
  });
}
