import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { slpDb } from "@/lib/db/server";

// Magic-link landing: exchanges the code (PKCE) or token hash for a session cookie.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const fail = (reason: string) => NextResponse.redirect(new URL(`/slp/login?error=${reason}`, url.origin));

  // Supabase puts its own failure in the query string (e.g. the link was already used).
  const supabaseError = url.searchParams.get("error_code") ?? url.searchParams.get("error");
  if (supabaseError) return fail(supabaseError === "otp_expired" ? "expired" : "link");

  const db = await slpDb();
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  try {
    if (code) {
      const { error } = await db.auth.exchangeCodeForSession(code);
      // The PKCE verifier lives in a cookie of the browser that asked for the link.
      if (error) return fail(/verifier|code challenge/i.test(error.message) ? "browser" : "expired");
    } else if (tokenHash) {
      const type = (url.searchParams.get("type") ?? "magiclink") as EmailOtpType;
      const { error } = await db.auth.verifyOtp({ token_hash: tokenHash, type });
      if (error) return fail("expired");
    } else {
      return fail("link");
    }
  } catch (e) {
    console.error("auth callback failed", e);
    return fail("link");
  }
  return NextResponse.redirect(new URL("/slp", url.origin));
}
