// Interpret a spoken yes/no answer (Hindi, Romanised Hindi, English).
// "No" is checked first so "नहीं, ठीक हूँ" is never read as yes.

import { normaliseText, tokenise } from "./hindiNormalise";

export type YesNo = "yes" | "no" | "unknown";

const NO = ["नहीं", "नही", "ना", "नो", "कोई नहीं", "nahi", "nahin", "nai", "na", "no", "nope"];
const YES = ["हाँ", "हां", "हा", "जी", "जी हाँ", "हाँ जी", "ठीक", "चलो", "चलिए", "शुरू", "बिल्कुल", "हम्म",
  "haan", "han", "ha", "ji", "theek", "thik", "chalo", "chaliye", "shuru", "bilkul", "yes", "yeah", "ok", "okay", "sure"];

export function parseYesNo(transcript: string | null | undefined): YesNo {
  if (!transcript) return "unknown";
  const tokens = tokenise(transcript);
  const text = tokens.join(" ");
  const has = (list: string[]) =>
    list.some((p) => {
      const n = normaliseText(p);
      return n.includes(" ") ? text.includes(n) : tokens.includes(n);
    });
  if (has(NO)) return "no";
  if (has(YES)) return "yes";
  return "unknown";
}
