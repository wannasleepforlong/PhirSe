// Drives a full patient session against a running dev server, using Bulbul TTS audio as the
// "patient". Pattern per item: correct, wrong word, silence, correct after cue, ...
// Usage: node --env-file=.env scripts/e2e-session.mjs <patient-token> [baseUrl]

const token = process.argv[2];
const base = process.argv[3] ?? "http://localhost:3000";
if (!token) throw new Error("usage: e2e-session.mjs <token> [baseUrl]");
const key = process.env.SARVAM_API_KEY;
const H = { "x-patient-token": token };

const ttsCache = new Map();
async function say(text) {
  if (ttsCache.has(text)) return ttsCache.get(text);
  let r;
  for (let i = 0; i < 6; i++) {
  r = await fetch("https://api.sarvam.ai/text-to-speech", {
    method: "POST",
    headers: { "api-subscription-key": key, "content-type": "application/json" },
    body: JSON.stringify({ text, language_code: "hi-IN", model: "bulbul:v3", speaker: "rahul", pace: 0.9, speech_sample_rate: 16000, output_audio_codec: "wav" }),
  });
  if (r.status !== 429) break;
  await new Promise((res) => setTimeout(res, 800 * 2 ** i));
  }
  const j = await r.json();
  if (!r.ok) throw new Error(JSON.stringify(j));
  const buf = Buffer.from(j.audios[0], "base64");
  ttsCache.set(text, buf);
  return buf;
}

async function post(path, body, json = true) {
  const t = Date.now();
  const r = await fetch(base + path, { method: "POST", headers: json ? { ...H, "content-type": "application/json" } : H, body });
  const j = await r.json();
  if (!r.ok) throw new Error(`${path} ${r.status}: ${JSON.stringify(j)}`);
  return { ...j, ms: Date.now() - t };
}

async function attempt(sid, text) {
  const form = new FormData();
  form.append("audio", new Blob([await say(text)], { type: "audio/wav" }), "a.wav");
  form.append("latencyMs", "1200");
  form.append("speechDetected", "true");
  return post(`/api/p/session/${sid}/attempt`, form, false);
}

// Look up target words for this patient so the fake patient can say them.
{
  const { createClient } = await import("@supabase/supabase-js");
  const { createHash } = await import("node:crypto");
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const hash = createHash("sha256").update(process.env.TOKEN_PEPPER).update(":").update(token).digest("hex");
  const { data: p } = await db.from("patient").select("id").eq("access_token_hash", hash).single();
  const { data: words } = await db.from("word_item").select("id, target_deva").eq("patient_id", p.id);
  globalThis.targets = Object.fromEntries(words.map((w) => [w.id, w.target_deva]));
}

const WRONG = "बिस्तर";
const t0 = Date.now();
const start = await post("/api/p/session/start", "{}");
console.log(`start: ${start.ms} ms, prefetch ${start.prefetch.length} clips, first=${start.action.kind} "${start.action.clips[0]?.text}"`);
const sid = start.sessionId;

// Map item ids to targets via clip text of the model cue (contains the word).
let action = start.action;
let step = 0;
let itemCount = 0;
let lastItem = null;
while (action.kind !== "end" && action.kind !== "safety_exit" && step < 120) {
  step++;
  const text = action.clips.map((c) => c.text).join(" / ");
  let res;
  if (action.kind === "ask_yes_no") {
    const answer = action.phase === "GREETING" ? "हाँ जी" : "नहीं";
    res = await attempt(sid, answer); // voice answer
    console.log(`[${action.phase}] ask: "${text}" -> said "${answer}" (${res.ms} ms)`);
  } else if (action.kind === "play_only") {
    res = await post(`/api/p/session/${sid}/event`, JSON.stringify({ type: "played" }));
    console.log(`[${action.phase}] play: "${text}"`);
  } else if (action.phase === "WARMUP") {
    res = await attempt(sid, "एक दो तीन चार पाँच");
    console.log(`[WARMUP] "${text}" -> counting (${res.ms} ms)`);
  } else {
    if (action.itemId !== lastItem) { itemCount++; lastItem = action.itemId; }
    const pattern = itemCount % 4; // 1 correct, 2 wrong then cues, 3 silence then cue, 0 correct
    const isModel = action.cue === "model";
    const target = action.clips.at(-1).text; // the cue text; real target taken from model when needed
    let said;
    if (action.phase === "PROBE") said = itemCount % 2 ? "पता नहीं" : WRONG;
    else if (pattern === 2 && !isModel) said = WRONG;
    else if (pattern === 3 && action.cue === "prompt") said = null;
    else said = "__TARGET__";

    if (said === null) {
      res = await post(`/api/p/session/${sid}/event`, JSON.stringify({ type: "silence_timeout" }));
      console.log(`[${action.phase}] ${action.cue}: "${target}" -> silence`);
    } else {
      if (said === "__TARGET__") {
        // Ask the server's model cue text for this item: first word before "।".
        said = globalThis.targets?.[action.itemId];
        if (!said) said = WRONG;
      }
      res = await attempt(sid, said);
      console.log(`[${action.phase}] ${action.cue}: "${target}" -> said "${said}" => ${res.score?.score ?? "-"} ${res.score?.reason ?? ""} (${res.ms} ms)`);
    }
  }
  action = res.action;
}
console.log(`final: ${action.kind} phase=${action.phase} progress=${JSON.stringify(action.progress)} total ${Math.round((Date.now() - t0) / 1000)} s`);
