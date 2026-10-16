// Seeds (or refreshes) the demo practice profile with the shared starter word list.
// Usage: node --env-file=.env scripts/seed-demo.mjs [--showcase]
// Prints the practice and dashboard links. Re-running rotates the demo link.
// --showcase makes the profile read-only (for the public /demo dashboard; set DEMO_SHOWCASE_TOKEN).

import { createClient } from "@supabase/supabase-js";
import { createHash, randomBytes } from "node:crypto";
import fs from "node:fs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const pepper = process.env.TOKEN_PEPPER;
if (!url || !key || !pepper) throw new Error("Need NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TOKEN_PEPPER");
const db = createClient(url, key, { auth: { persistSession: false } });
const starter = JSON.parse(fs.readFileSync(new URL("../lib/words/starter.json", import.meta.url), "utf8"));

const showcase = process.argv.includes("--showcase");

async function main() {
  const token = randomBytes(24).toString("base64url");
  const hash = createHash("sha256").update(pepper).update(":").update(token).digest("hex");

  let { data: profile } = await db
    .from("patient")
    .select("id")
    .eq("is_demo", true)
    // try_demo is null on older profiles; a plain "not true" filter would drop those.
    .or("settings->>try_demo.is.null,settings->>try_demo.neq.true")
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (profile) {
    const { data: cur } = await db.from("patient").select("settings").eq("id", profile.id).single();
    await db
      .from("patient")
      .update({ access_token_hash: hash, token_revoked_at: null, status: "active", settings: { ...cur.settings, read_only: showcase } })
      .eq("id", profile.id);
  } else {
    const { data, error } = await db
      .from("patient")
      .insert({
        slp_id: null,
        display_name: "शर्मा",
        honorific: "जी",
        is_demo: true,
        created_by_relation: "child",
        access_token_hash: hash,
        settings: { read_only: showcase },
      })
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
  if (showcase) console.log(`Read-only showcase. Put this in .env: DEMO_SHOWCASE_TOKEN=${token}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
