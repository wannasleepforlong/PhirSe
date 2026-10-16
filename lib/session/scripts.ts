// Default Hindi wording for system clips and item cues.
// Only "hello" contains the patient's name; every other line is identical for all patients,
// so its audio is rendered once and shared from the Supabase clip cache.
// Draft wording: the supervising SLP must approve it before any patient hears it.

import type { CueStep, SystemClip } from "@/lib/engine/stateMachine";

export interface PatientNaming {
  displayName: string;
  honorific: string;
}

export const PRAISE: string[] = [
  "बहुत बढ़िया!",
  "शाबाश! आपने खुद बोला।",
  "बिल्कुल सही। बहुत अच्छे।",
  "वाह! बहुत अच्छा।",
  "बहुत खूब! ऐसे ही।",
  "सही! आप बहुत अच्छा कर रहे हैं।",
];

export function systemClipText(key: SystemClip, who: PatientNaming, variant = 0): string {
  const name = `${who.displayName} ${who.honorific}`.trim();
  switch (key) {
    case "hello":
      return `नमस्ते ${name}!`;
    case "greeting":
      return "मैं फिर-से की AI साथी हूँ, कोई इंसान नहीं। आपकी थेरेपिस्ट ने आज की प्रैक्टिस भेजी है। शुरू करें?";
    case "safety_check":
      return "आज कोई नई परेशानी है? जैसे चक्कर, कमज़ोरी, या बोलने में नई दिक्कत?";
    case "warmup":
      return "चलिए पहले साथ में गिनते हैं। एक, दो, तीन… अब आप दस तक गिनिए।";
    case "probe_intro":
      return "अब कुछ शब्द बिना हिंट के। जो याद आए, बोलिए। कोई जल्दी नहीं।";
    case "probe_thanks":
      return "शुक्रिया।";
    case "practice_intro":
      return "अब शब्दों का अभ्यास करते हैं। आराम से सोचिए।";
    case "praise":
      return PRAISE[variant % PRAISE.length];
    case "effort":
      return "बहुत अच्छी कोशिश! चलिए अगला शब्द।";
    case "easier":
      return "कोई बात नहीं। थोड़े आसान शब्द करते हैं।";
    case "paused":
      return "ठीक है, रुकते हैं। जब तैयार हों, बटन दबाइए।";
    case "close":
      return "आज के लिए बस इतना। बहुत अच्छा किया। कल फिर मिलते हैं।";
    case "goodbye":
      return "कोई बात नहीं। फिर कभी करते हैं। अपना ध्यान रखिए।";
    case "safety_exit":
      return "अभ्यास रोक रहे हैं। अगर कोई नई परेशानी है, अभी एक सौ बारह या एक सौ आठ पर कॉल करें। आपके परिवार और थेरेपिस्ट को बताया जा रहा है।";
  }
}

export interface ItemTexts {
  target_deva: string;
  prompt_text: string | null;
  frame_text: string | null;
  semantic_cue_text: string | null;
  phonemic_cue_text: string | null;
  model_text: string | null;
}

const MATRA_OR_SIGN = /[ा-्ँ-ः]/;

/** First written syllable of a Devanagari word: consonant + matra (कप -> क, चाय -> चा). */
export function firstAkshara(word: string): string {
  const chars = Array.from(word.trim());
  let out = chars[0] ?? "";
  for (let i = 1; i < chars.length && MATRA_OR_SIGN.test(chars[i]) && chars[i] !== "्"; i++) out += chars[i];
  return out;
}

export function itemClipText(item: ItemTexts, cue: CueStep): string {
  const t = item.target_deva;
  switch (cue) {
    case "prompt":
      return item.prompt_text ?? item.frame_text ?? `इसका नाम बताइए।`;
    case "semantic":
      return item.semantic_cue_text ?? item.frame_text ?? "थोड़ा सोचिए, आप इसे रोज़ देखते हैं।";
    case "phonemic":
      return item.phonemic_cue_text ?? `यह ${firstAkshara(t)}… से शुरू होता है।`;
    case "model":
      return item.model_text ?? `${t}। अब आप बोलिए: ${t}।`;
  }
}
