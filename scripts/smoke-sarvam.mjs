// Smoke test: Bulbul TTS says a word, then both STT passes transcribe it.
// Usage: node --env-file=.env scripts/smoke-sarvam.mjs [word]
const key = process.env.SARVAM_API_KEY;
if (!key) throw new Error("SARVAM_API_KEY missing");
const word = process.argv[2] ?? "कप";

const t0 = Date.now();
const tts = await fetch("https://api.sarvam.ai/text-to-speech", {
  method: "POST",
  headers: { "api-subscription-key": key, "content-type": "application/json" },
  body: JSON.stringify({ text: word, language_code: "hi-IN", model: "bulbul:v3", speaker: "priya", pace: 0.8, speech_sample_rate: 16000, output_audio_codec: "wav" }),
});
const ttsJson = await tts.json();
if (!tts.ok) throw new Error(`TTS ${tts.status}: ${JSON.stringify(ttsJson)}`);
const wav = Buffer.from(ttsJson.audios[0], "base64");
console.log(`TTS ok: ${wav.length} bytes in ${Date.now() - t0} ms`);

async function stt(fields) {
  const form = new FormData();
  form.append("file", new Blob([wav], { type: "audio/wav" }), "a.wav");
  form.append("language_code", "hi-IN");
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  const t = Date.now();
  const r = await fetch("https://api.sarvam.ai/speech-to-text", { method: "POST", headers: { "api-subscription-key": key }, body: form });
  return { status: r.status, ms: Date.now() - t, body: await r.json() };
}

const runs = {
  "A v3 verbatim": { model: "saaras:v3", mode: "verbatim" },
  "v3 codemix": { model: "saaras:v3", mode: "codemix" },
  "v4 default": { model: "saaras:v4" },
  "B v4 keyterms": { model: "saaras:v4", keyterms: JSON.stringify([word]) },
  "v4 + mode verbatim": { model: "saaras:v4", mode: "verbatim" },
  "v3 + keyterms": { model: "saaras:v3", mode: "verbatim", keyterms: JSON.stringify([word]) },
};
for (const [name, f] of Object.entries(runs)) {
  const r = await stt(f);
  console.log(`${name.padEnd(20)} ${r.status} ${String(r.ms).padStart(5)} ms  ${JSON.stringify(r.body.transcript ?? r.body)}`);
}
