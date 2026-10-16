// Seeds (or refreshes) the demo practice profile with the shared starter word list.
// Usage: node --env-file=.env scripts/seed-demo.mjs
// Prints the practice and dashboard links. Re-running rotates the demo link.

import { createClient } from "@supabase/supabase-js";
import { createHash, randomBytes } from "node:crypto";
import fs from "node:fs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const pepper = process.env.TOKEN_PEPPER;
if (!url || !key || !pepper) throw new Error("Need NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TOKEN_PEPPER");
const db = createClient(url, key, { auth: { persistSession: false } });
const starter = JSON.parse(fs.readFileSync(new URL("../lib/words/starter.json", import.meta.url), "utf8"));

async function main() {
  const token = randomBytes(24).toString("base64url");
  const hash = createHash("sha256").update(pepper).update(":").update(token).digest("hex");

  let { data: profile } = await db.from("patient").select("id").eq("is_demo", true).limit(1).maybeSingle();
  if (profile) {
    await db.from("patient").update({ access_token_hash: hash, token_revoked_at: null, status: "active" }).eq("id", profile.id);
  } else {
    const { data, error } = await db
      .from("patient")
      .insert({ slp_id: null, display_name: "शर्मा", honorific: "जी", is_demo: true, created_by_relation: "child", access_token_hash: hash })
      .select("id")
      .single();
    if (error) throw error;
    profile = data;
    await db.from("consent").insert({ patient_id: profile.id, sessions: true, recording: true, signed_at: new Date().toISOString() });
  }

  const { count } = await db.from("word_item").select("id", { count: "exact", head: true }).eq("patient_id", profile.id);
  if (!count) {
    const rows = [
      ...starter.practised.map((w) => ({ set: "treated", target_deva: w.target, prompt_text: w.prompt, semantic_cue_text: w.meaning ?? null, accepted_forms: w.also })),
      ...starter.check.map((w) => ({ set: "untreated", target_deva: w.target, prompt_text: w.prompt, semantic_cue_text: null, accepted_forms: w.also })),
    ].map((r) => ({ ...r, patient_id: profile.id, source: "starter" }));
    const { error } = await db.from("word_item").insert(rows);
    if (error) throw error;
  }

  console.log(`Demo profile: ${profile.id}`);
  console.log(`Practice:  http://localhost:3000/p/${token}`);
  console.log(`Dashboard: http://localhost:3000/p/${token}/dashboard`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
