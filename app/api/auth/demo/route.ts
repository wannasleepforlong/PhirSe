import { NextResponse } from "next/server";
import { adminDb } from "@/lib/db/admin";
import { slpDb } from "@/lib/db/server";

// One-click sign-in as the demo SLP (simulated data only). Disabled unless DEMO_LOGIN_ENABLED=true.
export const runtime = "nodejs";
const DEMO_EMAIL = "demo-slp@phirse.app";

export async function POST(req: Request) {
  const origin = new URL(req.url).origin;
  if (process.env.DEMO_LOGIN_ENABLED !== "true") return NextResponse.redirect(new URL("/slp/login?error=demo", origin), 303);
  const { data, error } = await adminDb().auth.admin.generateLink({ type: "magiclink", email: DEMO_EMAIL });
  if (error || !data.properties?.hashed_token) return NextResponse.redirect(new URL("/slp/login?error=demo", origin), 303);
  const db = await slpDb();
  const { error: verifyError } = await db.auth.verifyOtp({ token_hash: data.properties.hashed_token, type: "magiclink" });
  return NextResponse.redirect(new URL(verifyError ? "/slp/login?error=demo" : "/slp", origin), 303);
}
