// Seeds a demo SLP, a demo patient and a demo word list (clearly marked as demo content).
// Usage: node --env-file=.env scripts/seed-demo.mjs
// Prints the patient link. Re-running rotates the demo patient's link.

import { createClient } from "@supabase/supabase-js";
import { createHash, randomBytes } from "node:crypto";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const pepper = process.env.TOKEN_PEPPER;
if (!url || !key || !pepper) throw new Error("Need NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TOKEN_PEPPER");
const db = createClient(url, key, { auth: { persistSession: false } });

const DEMO_EMAIL = "demo-slp@phirse.app";

// [target, prompt, semantic cue, accepted forms]
const TREATED = [
  ["कप", "सुबह हम चाय किसमें पीते हैं?", "यह रसोई में होता है, इसे हैंडल से पकड़ते हैं।", ["kap", "cup", "प्याला"]],
  ["चाय", "सुबह-सुबह हम कौन सी गरम चीज़ पीते हैं?", "इसमें दूध, पत्ती और चीनी डालते हैं।", ["chai", "tea"]],
  ["पानी", "प्यास लगे तो हम क्या पीते हैं?", "यह नल से आता है।", ["paani", "pani", "water", "जल"]],
  ["रोटी", "दाल के साथ हम क्या खाते हैं, जो तवे पर बनती है?", "इसे आटे से बनाते हैं।", ["roti", "chapati", "चपाती", "फुलका"]],
  ["दरवाज़ा", "घर के अंदर आने के लिए हम क्या खोलते हैं?", "इस पर ताला लगता है।", ["darwaza", "door"]],
  ["चाबी", "ताला खोलने के लिए क्या लगाते हैं?", "यह छोटी सी होती है, जेब में रखते हैं।", ["chabi", "chaabi", "key", "चाभी"]],
  ["चश्मा", "पढ़ने के लिए आँखों पर क्या लगाते हैं?", "इसमें दो शीशे होते हैं।", ["chashma", "glasses", "spectacles"]],
  ["घड़ी", "समय देखने के लिए हम क्या देखते हैं?", "इसे कलाई पर पहनते हैं।", ["ghadi", "watch", "clock"]],
  ["फ़ोन", "बात करने के लिए हम किस पर नंबर मिलाते हैं?", "इसकी घंटी बजती है।", ["phone", "fon", "mobile", "मोबाइल"]],
  ["चम्मच", "दाल खाने के लिए हम क्या इस्तेमाल करते हैं?", "यह कटोरी के साथ आती है, स्टील की होती है।", ["chammach", "spoon"]],
  ["कुर्सी", "बैठने के लिए हम किस पर बैठते हैं?", "इसकी चार टांगें होती हैं।", ["kursi", "chair"]],
  ["बिस्तर", "रात को हम किस पर सोते हैं?", "इस पर तकिया और चादर होती है।", ["bistar", "bed", "पलंग"]],
  ["दवाई", "बीमार होने पर डॉक्टर क्या देते हैं?", "इसे पानी के साथ खाते हैं।", ["dawai", "dawa", "दवा", "medicine", "गोली"]],
  ["चप्पल", "घर में पैरों में क्या पहनते हैं?", "इसे दरवाज़े पर उतारते हैं।", ["chappal", "slipper", "slippers"]],
  ["अख़बार", "सुबह कौन सा कागज़ आता है जिसमें ख़बरें होती हैं?", "इसे चाय के साथ पढ़ते हैं।", ["akhbaar", "akhbar", "newspaper", "paper"]],
  ["टीवी", "शाम को हम समाचार किस पर देखते हैं?", "इसका रिमोट होता है।", ["tv", "टेलीविज़न", "television"]],
];

const UNTREATED = [
  ["सेब", "कौन सा लाल फल रोज़ खाने से सेहत अच्छी रहती है?", "", ["seb", "apple"]],
  ["तकिया", "सोते समय सिर के नीचे क्या रखते हैं?", "", ["takiya", "pillow"]],
  ["छाता", "बारिश में भीगने से बचने के लिए क्या खोलते हैं?", "", ["chhata", "chata", "umbrella"]],
  ["कंघी", "बाल बनाने के लिए क्या इस्तेमाल करते हैं?", "", ["kanghi", "comb"]],
  ["साबुन", "हाथ धोने के लिए पानी के साथ क्या लगाते हैं?", "", ["sabun", "soap"]],
  ["पंखा", "गर्मी में छत पर क्या घूमता है?", "", ["pankha", "fan"]],
  ["ताला", "दरवाज़ा बंद करके उस पर क्या लगाते हैं?", "", ["taala", "tala", "lock"]],
  ["गिलास", "पानी हम किसमें डालकर पीते हैं?", "", ["gilaas", "glass"]],
];

async function ensureSlp() {
  const { data: list } = await db.auth.admin.listUsers({ perPage: 200 });
  let user = list?.users.find((u) => u.email === DEMO_EMAIL);
  if (!user) {
    const { data, error } = await db.auth.admin.createUser({ email: DEMO_EMAIL, email_confirm: true });
    if (error) throw error;
    user = data.user;
  }
  const { data: slp, error } = await db
    .from("slp")
    .upsert({ auth_user_id: user.id, name: "Demo SLP (simulated)", email: DEMO_EMAIL }, { onConflict: "auth_user_id" })
    .select("id")
    .single();
  if (error) throw error;
  return slp.id;
}

async function main() {
  const slpId = await ensureSlp();
  const token = randomBytes(24).toString("base64url");
  const hash = createHash("sha256").update(pepper).update(":").update(token).digest("hex");

  let { data: patient } = await db.from("patient").select("id").eq("slp_id", slpId).eq("is_demo", true).maybeSingle();
  if (patient) {
    await db.from("patient").update({ access_token_hash: hash, token_revoked_at: null, status: "active" }).eq("id", patient.id);
  } else {
    const { data, error } = await db
      .from("patient")
      .insert({ slp_id: slpId, display_name: "शर्मा", honorific: "जी", is_demo: true, access_token_hash: hash })
      .select("id")
      .single();
    if (error) throw error;
    patient = data;
    await db.from("consent").insert({
      patient_id: patient.id, sessions: true, recording: true, slp_access: true,
      anonymised_metrics: true, demo_use: true, family_clip_share: true, signed_at: new Date().toISOString(),
    });
  }

  const { count } = await db.from("word_item").select("id", { count: "exact", head: true }).eq("patient_id", patient.id);
  if (!count) {
    const now = new Date().toISOString();
    const rows = [
      ...TREATED.map(([t, p, s, f]) => ({ set: "treated", target_deva: t, prompt_text: p, semantic_cue_text: s, accepted_forms: f })),
      ...UNTREATED.map(([t, p, s, f]) => ({ set: "untreated", target_deva: t, prompt_text: p, semantic_cue_text: s || null, accepted_forms: f })),
    ].map((r) => ({ ...r, patient_id: patient.id, source: "slp", approved_at: now, approved_by: slpId }));
    const { error } = await db.from("word_item").insert(rows);
    if (error) throw error;
  }

  console.log(`Demo patient: ${patient.id}`);
  console.log(`Patient link: http://localhost:3000/p/${token}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
