import { NextResponse } from "next/server";
import { SessionError } from "./service";

export function patientToken(req: Request): string | null {
  return req.headers.get("x-patient-token");
}

export function errorResponse(e: unknown) {
  if (e instanceof SessionError) return NextResponse.json({ error: e.message }, { status: e.status });
  console.error(e);
  return NextResponse.json({ error: "something went wrong" }, { status: 500 });
}
