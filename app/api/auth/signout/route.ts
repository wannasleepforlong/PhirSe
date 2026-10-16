import { NextResponse } from "next/server";
import { slpDb } from "@/lib/db/server";

export async function POST(req: Request) {
  const db = await slpDb();
  await db.auth.signOut();
  return NextResponse.redirect(new URL("/slp/login", new URL(req.url).origin), 303);
}
