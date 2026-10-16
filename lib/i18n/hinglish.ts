// Devanagari -> readable Hinglish (Roman Hindi as people type it on WhatsApp), for display only.
// Matching uses lib/engine/hindiNormalise.ts; this file only makes captions readable.

const VOWEL: Record<string, string> = {
  "अ": "a", "आ": "aa", "इ": "i", "ई": "ee", "उ": "u", "ऊ": "oo", "ऋ": "ri",
  "ए": "e", "ऐ": "ai", "ओ": "o", "औ": "au", "ऍ": "e", "ऑ": "o",
};
const MATRA: Record<string, string> = {
  "ा": "aa", "ि": "i", "ी": "ee", "ु": "u", "ू": "oo", "ृ": "ri",
  "े": "e", "ै": "ai", "ो": "o", "ौ": "au", "ॅ": "e", "ॉ": "o",
};
const CONS: Record<string, string> = {
  "क": "k", "ख": "kh", "ग": "g", "घ": "gh", "ङ": "n", "च": "ch", "छ": "chh", "ज": "j", "झ": "jh", "ञ": "n",
  "ट": "t", "ठ": "th", "ड": "d", "ढ": "dh", "ण": "n", "त": "t", "थ": "th", "द": "d", "ध": "dh", "न": "n",
  "प": "p", "फ": "ph", "ब": "b", "भ": "bh", "म": "m", "य": "y", "र": "r", "ल": "l", "व": "v", "श": "sh",
  "ष": "sh", "स": "s", "ह": "h", "ळ": "l",
};
const NUKTA_CONS: Record<string, string> = {
  "क": "q", "ख": "kh", "ग": "gh", "ज": "z", "ड": "d", "ढ": "dh", "फ": "f", "य": "y",
};
const PRECOMPOSED: Record<string, string> = {
  "क़": "क़", "ख़": "ख़", "ग़": "ग़", "ज़": "ज़",
  "ड़": "ड़", "ढ़": "ढ़", "फ़": "फ़", "य़": "य़",
};

interface Unit {
  c: string;        // consonant (possibly a cluster), "" for an independent vowel
  v: string;        // vowel sound, "" when killed by virama
  inherent: boolean; // v is the implicit schwa
  nasal: boolean;
}

function units(word: string): Unit[] {
  const chars = Array.from(word.replace(/[क़-य़]/g, (ch) => PRECOMPOSED[ch] ?? ch));
  const out: Unit[] = [];
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (CONS[ch] !== undefined) {
      let c = CONS[ch];
      if (chars[i + 1] === "़") {
        c = NUKTA_CONS[ch] ?? c;
        i++;
      }
      const next = chars[i + 1];
      if (next === "्") {
        out.push({ c, v: "", inherent: false, nasal: false });
        i++;
      } else if (next !== undefined && MATRA[next] !== undefined) {
        out.push({ c, v: MATRA[next], inherent: false, nasal: false });
        i++;
      } else {
        out.push({ c, v: "a", inherent: true, nasal: false });
      }
    } else if (VOWEL[ch] !== undefined) {
      out.push({ c: "", v: VOWEL[ch], inherent: false, nasal: false });
    } else if (ch === "ं" || ch === "ँ") {
      if (out.length) out[out.length - 1].nasal = true;
      else out.push({ c: "n", v: "", inherent: false, nasal: false });
    } else if (ch === "ः") {
      out.push({ c: "h", v: "", inherent: false, nasal: false });
    } else {
      out.push({ c: ch, v: "", inherent: false, nasal: false });
    }
  }
  return out;
}

const hasVowel = (u: Unit | undefined) => !!u && u.v !== "";

/** Hindi schwa deletion: drop word-final schwa, and a medial schwa in the pattern V C(a) C V. */
function deleteSchwas(us: Unit[]): Unit[] {
  const r = us.map((u) => ({ ...u }));
  const last = r.length - 1;
  if (r.length > 1 && r[last].inherent && !r[last].nasal) r[last].v = "";
  for (let i = r.length - 2; i >= 1; i--) {
    const u = r[i];
    if (!u.inherent || u.nasal) continue;
    if (hasVowel(r[i - 1]) && r[i + 1].c !== "" && hasVowel(r[i + 1])) {
      u.v = "";
      i--; // never delete two schwas in a row
    }
  }
  return r;
}

// Everyday words whose usual Hinglish spelling the rules do not produce.
const LEXICON: Record<string, string> = {
  "यह": "yeh", "वह": "woh", "ये": "ye", "वो": "wo", "हम": "hum", "तुम": "tum", "नहीं": "nahi",
  "मैं": "main", "में": "mein", "हैं": "hain", "है": "hai", "और": "aur", "कि": "ki", "जी": "ji",
};

function wordToHinglish(word: string): string {
  if (!/[ऀ-ॿ]/.test(word)) return word;
  if (LEXICON[word]) return LEXICON[word];
  const us = deleteSchwas(units(word));
  let out = "";
  us.forEach((u, i) => {
    const final = i === us.length - 1;
    let v = u.v;
    if (final && !u.nasal && v === "aa") v = "a";
    if (final && !u.nasal && v === "ee") v = "i";
    if (final && !u.nasal && v === "oo") v = "u";
    out += u.c + v;
    if (u.nasal) out += final && v === "e" ? "in" : "n";
  });
  return out
    .replace(/aay$/, "ai")
    .replace(/^ah$/, "ah");
}

/** Convert running Devanagari text to Hinglish; punctuation and Latin words are kept. */
export function toHinglish(text: string): string {
  const converted = text
    .replace(/[।॥]/g, ".")
    .replace(/[ऀ-ॿ]+/g, (w) => wordToHinglish(w));
  // Capitalise sentence starts for readability.
  return converted.replace(/(^|[.?!]\s+)([a-z])/g, (_, p, c) => p + c.toUpperCase());
}
