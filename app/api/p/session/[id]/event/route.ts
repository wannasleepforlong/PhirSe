import { NextResponse } from "next/server";
import { handleEvent, type ClientEventType } from "@/lib/session/service";
import { errorResponse, patientToken } from "@/lib/session/http";

export const runtime = "nodejs";

const ALLOWED: ClientEventType[] = ["played", "yes", "no", "silence_timeout", "skip", "pause", "resume", "stop", "help"];

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = (await req.json().catch(() => ({}))) as { type?: string };
    if (!ALLOWED.includes(body.type as ClientEventType)) {
      return NextResponse.json({ error: "unknown event" }, { status: 400 });
    }
    return NextResponse.json({ action: await handleEvent(patientToken(req), id, body.type as ClientEventType) });
  } catch (e) {
    return errorResponse(e);
  }
}
