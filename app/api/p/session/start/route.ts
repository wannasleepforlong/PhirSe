import { NextResponse } from "next/server";
import { startSession } from "@/lib/session/service";
import { errorResponse, patientToken } from "@/lib/session/http";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    return NextResponse.json(await startSession(patientToken(req)));
  } catch (e) {
    return errorResponse(e);
  }
}
