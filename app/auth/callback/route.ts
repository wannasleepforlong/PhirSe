import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { slpDb } from "@/lib/db/server";

// Magic-link landing: exchanges the code or token hash for a session cookie.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const db = await slpDb();
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = (url.searchParams.get("type") ?? "magiclink") as EmailOtpType;
  const { error } = code
    ? await db.auth.exchangeCodeForSession(code)
    : tokenHash
      ? await db.auth.verifyOtp({ token_hash: tokenHash, type })
      : { error: new Error("missing code") };
  return NextResponse.redirect(new URL(error ? "/slp/login?error=link" : "/slp", url.origin));
}
