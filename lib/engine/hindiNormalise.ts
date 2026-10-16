// Normalisation helpers for matching Hindi / Romanised Hindi / English answers.
// Pure functions only: no network, no framework imports.

const DEVANAGARI = /[ऀ-ॿ]/;

// Nukta letters folded to their base letters (क़ -> क, ज़ -> ज ...).
const NUKTA_PRECOMPOSED: Record<string, string> = {
  "क़": "क", // क़
  "ख़": "ख", // ख़
  "ग़": "ग", // ग़
  "ज़": "ज", // ज़
  "ड़": "ड", // ड़
  "ढ़": "ढ", // ढ़
  "फ़": "फ", // फ़
  "य़": "य", // य़
};

export function isDevanagari(text: string): boolean {
  return DEVANAGARI.test(text);
}

/**
 * Canonical form of a Devanagari or Latin string for exact comparison.
 * - NFC, lowercase, punctuation stripped (danda included), whitespace collapsed
 * - nukta removed, chandrabindu folded to anusvara
 */
export function normaliseText(input: string): string {
  let s = input.normalize("NFC").toLowerCase();
  s = s.replace(/[क़-य़]/g, (c) => NUKTA_PRECOMPOSED[c] ?? c);
  s = s.replace(/़/g, ""); // combining nukta
  s = s.replace(/ँ/g, "ं"); // chandrabindu -> anusvara
  s = s.replace(/[।॥]/g, " "); // danda, double danda
  s = s.replace(/[^\p{L}\p{M}\p{N}\s]/gu, " ");
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

export function tokenise(input: string): string[] {
  const n = normaliseText(input);
  return n ? n.split(" ") : [];
}

// ---------- Loose Devanagari -> Roman transliteration ----------

const VOWELS: Record<string, string> = {
  "अ": "a", "आ": "aa", "इ": "i", "ई": "ii", "उ": "u",
  "ऊ": "uu", "ऋ": "ri", "ए": "e", "ऐ": "ai", "ओ": "o",
  "औ": "au", "ऍ": "e", "ऑ": "o",
};

const MATRAS: Record<string, string> = {
  "ा": "aa", "ि": "i", "ी": "ii", "ु": "u", "ू": "uu",
  "ृ": "ri", "े": "e", "ै": "ai", "ो": "o", "ौ": "au",
  "ॅ": "e", "ॉ": "o",
};

const CONSONANTS: Record<string, string> = {
  "क": "k", "ख": "kh", "ग": "g", "घ": "gh", "ङ": "n",
  "च": "ch", "छ": "chh", "ज": "j", "झ": "jh", "ञ": "n",
  "ट": "t", "ठ": "th", "ड": "d", "ढ": "dh", "ण": "n",
  "त": "t", "थ": "th", "द": "d", "ध": "dh", "न": "n",
  "प": "p", "फ": "ph", "ब": "b", "भ": "bh", "म": "m",
  "य": "y", "र": "r", "ल": "l", "व": "v", "श": "sh",
  "ष": "sh", "स": "s", "ह": "h", "ळ": "l",
};

const VIRAMA = "्";
const ANUSVARA = "ं";
const VISARGA = "ः";

/** Devanagari -> loose Roman. Word-final schwa dropped (कप -> kap, चाय -> chaay). */
export function devanagariToRoman(input: string): string {
  const chars = Array.from(normaliseText(input));
  let out = "";
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    const next = chars[i + 1];
    if (CONSONANTS[c] !== undefined) {
      out += CONSONANTS[c];
      if (next === VIRAMA) {
        i++;
      } else if (next !== undefined && MATRAS[next] !== undefined) {
        out += MATRAS[next];
        i++;
      } else {
        const atWordEnd = next === undefined || next === " ";
        if (!atWordEnd) out += "a";
      }
    } else if (VOWELS[c] !== undefined) {
      out += VOWELS[c];
    } else if (MATRAS[c] !== undefined) {
      out += MATRAS[c];
    } else if (c === ANUSVARA) {
      out += "n";
    } else if (c === VISARGA) {
      out += "h";
    } else {
      out += c;
    }
  }
  return out;
}

/**
 * Phonetic key used for comparing across scripts and spelling variants.
 * Folds common Romanisation differences: aa/a, ee/ii/i, oo/uu/u, w/v, z/j, ph/f, doubled letters.
 */
export function phoneticKey(input: string): string {
  const roman = isDevanagari(input) ? devanagariToRoman(input) : normaliseText(input);
  return roman
    .replace(/\s+/g, "")
    .replace(/ph/g, "f")
    .replace(/w/g, "v")
    .replace(/z/g, "j")
    .replace(/q/g, "k")
    .replace(/ee|ii/g, "i")
    .replace(/oo|uu/g, "u")
    .replace(/aa/g, "a")
    .replace(/y$/g, "i")
    .replace(/(.)\1+/g, "$1");
}

/** Levenshtein distance over code points. */
export function editDistance(a: string, b: string): number {
  const x = Array.from(a);
  const y = Array.from(b);
  const prev = new Array(y.length + 1).fill(0).map((_, j) => j);
  for (let i = 1; i <= x.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= y.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (x[i - 1] === y[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[y.length];
}

/** 1 = identical, 0 = completely different. */
export function similarity(a: string, b: string): number {
  if (!a && !b) return 1;
  const len = Math.max(Array.from(a).length, Array.from(b).length);
  return len === 0 ? 1 : 1 - editDistance(a, b) / len;
}
