import { NextResponse } from "next/server";
import { handleAttempt } from "@/lib/session/service";
import { errorResponse, patientToken } from "@/lib/session/http";

export const runtime = "nodejs";

const MAX_AUDIO_BYTES = 1_000_000; // ~30 s of 16 kHz mono 16-bit

function intOrNull(v: FormDataEntryValue | null): number | null {
  const n = Number(v);
  return v === null || !Number.isFinite(n) ? null : Math.round(n);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const form = await req.formData();
    const audio = form.get("audio");
    if (!(audio instanceof Blob) || audio.size === 0 || audio.size > MAX_AUDIO_BYTES) {
      return NextResponse.json({ error: "audio missing or too large" }, { status: 400 });
    }
    const result = await handleAttempt(patientToken(req), id, {
      audio,
      latencyMs: intOrNull(form.get("latencyMs")),
      durationMs: intOrNull(form.get("durationMs")),
      speechDetected: form.get("speechDetected") !== "false",
    });
    return NextResponse.json(result);
  } catch (e) {
    return errorResponse(e);
  }
}
