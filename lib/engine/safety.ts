// Safety keyword scan. Matching is deliberately broad: a false positive ends a session gently,
// a false negative is unacceptable. Review the list with a clinician before wider use.

import { normaliseText } from "./hindiNormalise";

export type SafetyCategory =
  | "befast"      // new stroke warning signs
  | "chest_pain"
  | "choking"
  | "distress"    // hopelessness, self-harm, crying
  | "stop";       // patient wants to stop

export interface SafetyHit {
  category: SafetyCategory;
  phrase: string;
}

export const SAFETY_PHRASES: Record<SafetyCategory, string[]> = {
  befast: [
    // weakness / numbness
    "हाथ काम नहीं", "पैर काम नहीं", "हाथ नहीं उठ", "पैर नहीं उठ", "सुन्न", "कमज़ोरी", "कमजोरी",
    "haath kaam nahi", "pair kaam nahi", "sunn", "kamzori", "kamjori", "numb", "weakness", "can't move",
    // face
    "मुँह टेढ़ा", "मुंह टेढ़ा", "चेहरा टेढ़ा", "muh tedha", "munh tedha", "face drooping",
    // vision
    "दिखाई नहीं", "धुंधला", "दो दो दिख", "dikhai nahi", "dikh nahi", "dhundhla", "can't see", "blurry",
    // balance
    "चक्कर", "गिर गया", "गिर गई", "संतुलन", "chakkar", "gir gaya", "gir gayi", "dizzy", "fell down",
    // headache
    "तेज़ सिर दर्द", "तेज सिर दर्द", "बहुत सिर दर्द", "tez sir dard", "severe headache",
    // speech suddenly worse
    "बोल नहीं पा", "bol nahi pa", "can't speak",
    // unconscious / emergency words
    "बेहोश", "behosh", "faint", "stroke", "लकवा", "lakwa",
  ],
  chest_pain: ["सीने में दर्द", "छाती में दर्द", "seene mein dard", "chhati mein dard", "chest pain"],
  choking: ["खाँसी", "खांसी", "अटक गया", "गला अटक", "साँस नहीं", "सांस नहीं", "khansi", "atak gaya", "saans nahi", "choking", "can't breathe"],
  distress: [
    "मरना", "मर जाऊं", "मर जाना", "जीना नहीं", "जीने का मन नहीं", "बेकार हूँ", "बेकार हूं", "कोई फायदा नहीं",
    "रोना", "रो रहा", "रो रही",
    "marna", "mar jaun", "jeena nahi", "bekaar hoon", "bekar hu", "koi fayda nahi", "ro raha", "ro rahi",
    "want to die", "kill myself", "hopeless", "give up",
  ],
  stop: ["बस करो", "बंद करो", "अब नहीं", "रहने दो", "bas karo", "band karo", "ab nahi", "rehne do", "stop"],
};

const PRIORITY: SafetyCategory[] = ["befast", "chest_pain", "choking", "distress", "stop"];

/** Scan one or more transcripts. Returns hits ordered by priority (most urgent first). */
export function scanSafety(...transcripts: Array<string | null | undefined>): SafetyHit[] {
  const text = transcripts.filter(Boolean).map((t) => normaliseText(t as string)).join(" | ");
  if (!text) return [];
  const hits: SafetyHit[] = [];
  for (const category of PRIORITY) {
    for (const phrase of SAFETY_PHRASES[category]) {
      if (text.includes(normaliseText(phrase))) {
        hits.push({ category, phrase });
        break;
      }
    }
  }
  return hits;
}

/** Categories that must stop the session and alert the family. */
export function isEmergency(hit: SafetyHit): boolean {
  return hit.category === "befast" || hit.category === "chest_pain" || hit.category === "choking";
}
