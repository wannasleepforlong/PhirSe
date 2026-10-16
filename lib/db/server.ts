// Supabase client bound to the signed-in SLP's cookies. Queries run under RLS.

import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function slpDb() {
  const store = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          /* called from a Server Component: middleware refreshes the session instead */
        }
      },
    },
  });
}

export interface SlpIdentity {
  slpId: string;
  name: string;
  email: string | null;
}

/** The signed-in SLP, creating their SLP profile on first sign-in. Null when signed out. */
export async function currentSlp(): Promise<SlpIdentity | null> {
  const db = await slpDb();
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) return null;
  const { data: slp } = await db.from("slp").select("id, name, email").eq("auth_user_id", auth.user.id).maybeSingle();
  if (slp) return { slpId: slp.id, name: slp.name, email: slp.email };
  const email = auth.user.email ?? null;
  const { data: created } = await db
    .from("slp")
    .insert({ auth_user_id: auth.user.id, name: email?.split("@")[0] ?? "SLP", email })
    .select("id, name, email")
    .single();
  return created ? { slpId: created.id, name: created.name, email: created.email } : null;
}
