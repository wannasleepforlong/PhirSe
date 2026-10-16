"""Combine model log-probs and recording quality into one clarity result for an attempt.

Clarity is a practice indicator for families, not a clinical measure. Every number that goes into
it is stored next to it, so the dashboard can say *why* (e.g. "first sound unclear", "too quiet").
"""

from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np

from .audio import AudioQuality
from .ctc import edit_distance, greedy_decode, target_match

DEVANAGARI = range(0x0900, 0x0980)
SP_SPACE = "▁"  # SentencePiece word-start marker

# Thresholds for the verifier's own verdict. Starting values; tune them on family/clinician labels.
MATCH_WORD = 0.6
MATCH_ARTICULATION = 0.5
CLOSE_WORD = 0.2


def is_devanagari(text: str) -> bool:
    return any(ord(c) in DEVANAGARI for c in text)


_NUKTA_PRECOMPOSED = {
    "क़": "क", "ख़": "ख", "ग़": "ग", "ज़": "ज",
    "ड़": "ड", "ढ़": "ढ", "फ़": "फ", "य़": "य",
}


def without_nukta(text: str) -> str:
    """फ़ोन -> फोन. Speakers and the model often drop the nukta; it is not a different word."""
    return "".join(_NUKTA_PRECOMPOSED.get(c, c) for c in text).replace("़", "")


class Vocab:
    """Token strings of a CTC model, with a greedy longest-match tokenizer for target words.

    Longest-match over the model's own pieces approximates SentencePiece well for single words,
    which is all we score.
    """

    def __init__(self, tokens: list[str], blank: int):
        self.tokens = tokens
        self.blank = blank
        self.index = {t: i for i, t in enumerate(tokens) if i != blank}
        self.max_len = max((len(t) for t in tokens), default=1)

    def encode(self, word: str) -> list[int] | None:
        word = word.strip()
        out: list[int] = []
        i = 0
        while i < len(word):
            found = None
            for n in range(min(self.max_len, len(word) - i), 0, -1):
                piece = word[i : i + n]
                cands = [SP_SPACE + piece, piece] if i == 0 else [piece]
                for c in cands:
                    if c in self.index:
                        found = (self.index[c], n)
                        break
                if found:
                    break
            if not found:
                return None
            out.append(found[0])
            i += found[1]
        return out

    def encode_variants(self, word: str, limit: int = 64) -> list[list[int]]:
        """Every way to split the word into vocabulary pieces (up to ``limit``), longest pieces first.

        CTC scores depend on the split, and the model's own SentencePiece split is unknown here,
        so the scorer tries each split and keeps the best. Single words have few splits.
        """
        word = word.strip()
        out: list[list[int]] = []

        def walk(i: int, acc: list[int]) -> None:
            if len(out) >= limit:
                return
            if i == len(word):
                out.append(list(acc))
                return
            for n in range(min(self.max_len, len(word) - i), 0, -1):
                piece = word[i : i + n]
                for c in ([SP_SPACE + piece, piece] if i == 0 else [piece]):
                    if c in self.index:
                        acc.append(self.index[c])
                        walk(i + n, acc)
                        acc.pop()
                        break

        walk(0, [])
        return out

    def decode(self, ids: list[int]) -> str:
        return "".join(self.tokens[i] for i in ids).replace(SP_SPACE, " ").strip()

    def piece(self, i: int) -> str:
        return self.tokens[i].replace(SP_SPACE, "")


@dataclass
class SoundScore:
    unit: str
    score: float
    start_s: float
    end_s: float


@dataclass
class Clarity:
    clarity: int  # 0..100 composite
    word_match: float  # 0..1, audio support for the target vs the model's own best guess
    articulation: float  # 0..1, mean confidence across the target's sounds
    fluency: float  # 0..1, penalises long pauses inside the word
    recording: float  # 0..1, from signal-to-noise
    verdict: str  # match | close | no_match | no_speech
    form: str | None  # accepted form that matched best
    heard: str  # model's free transcript
    similarity: float  # 1 - character error rate between heard and best form
    weakest: str | None  # unit with the lowest confidence, if clearly weak
    sounds: list[SoundScore] = field(default_factory=list)
    target_ll: float | None = None
    flags: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "clarity": self.clarity,
            "word_match": round(self.word_match, 3),
            "articulation": round(self.articulation, 3),
            "fluency": round(self.fluency, 3),
            "recording": round(self.recording, 3),
            "verdict": self.verdict,
            "form": self.form,
            "heard": self.heard,
            "similarity": round(self.similarity, 3),
            "weakest": self.weakest,
            "sounds": [
                {"unit": s.unit, "score": round(s.score, 3), "start_s": round(s.start_s, 2), "end_s": round(s.end_s, 2)}
                for s in self.sounds
            ],
            "flags": self.flags,
        }


def score_attempt(
    logp: np.ndarray,
    vocab: Vocab,
    frame_s: float,
    accepted_forms: list[str],
    quality: AudioQuality,
) -> Clarity:
    heard_ids, _ = greedy_decode(logp, vocab.blank)
    heard = vocab.decode(heard_ids)
    flags = list(quality.flags)
    recording = float(np.clip((quality.snr_db - 6.0) / 24.0, 0.0, 1.0))
    fluency = float(1.0 - 0.6 * np.clip(quality.longest_pause_s / 1.5, 0.0, 1.0))

    if "no_speech" in flags:
        return Clarity(0, 0.0, 0.0, 0.0, recording, "no_speech", None, heard, 0.0, None, [], None, flags)

    best = None
    forms: list[tuple[str, str]] = []  # (spelling scored, form reported)
    for form in accepted_forms:
        if is_devanagari(form):
            forms.append((form, form))
            plain = without_nukta(form)
            if plain != form:
                forms.append((plain, form))
    for spelled, form in forms:  # the Hindi acoustic model writes Devanagari; Roman/English spellings cannot be scored
        for ids in vocab.encode_variants(spelled):
            m = target_match(logp, ids, vocab.blank)
            if best is None or m.match > best[1].match:
                best = (form, m)

    if best is None:
        flags.append("target_not_in_vocab")
        return Clarity(0, 0.0, 0.0, fluency, recording, "no_match", None, heard, 0.0, None, [], None, flags)

    form, m = best
    sounds = [
        SoundScore(vocab.piece(a.token), a.score, a.start * frame_s, a.end * frame_s) for a in (m.alignment or [])
    ]
    articulation = float(np.mean([s.score for s in sounds])) if sounds else 0.0
    weakest = None
    if sounds:
        w = min(sounds, key=lambda s: s.score)
        if w.score < 0.5:
            weakest = w.unit

    target_chars = list(without_nukta(form))
    heard_chars = list(without_nukta(heard).replace(" ", ""))
    similarity = 1.0 - edit_distance(heard_chars, target_chars) / max(len(target_chars), len(heard_chars), 1)

    if m.match >= MATCH_WORD and articulation >= MATCH_ARTICULATION:
        verdict = "match"
    elif m.match >= CLOSE_WORD:
        verdict = "close"
    else:
        verdict = "no_match"

    clarity = round(100 * (0.45 * articulation + 0.35 * m.match + 0.10 * fluency + 0.10 * recording))
    return Clarity(
        clarity=int(np.clip(clarity, 0, 100)),
        word_match=m.match,
        articulation=articulation,
        fluency=fluency,
        recording=recording,
        verdict=verdict,
        form=form,
        heard=heard,
        similarity=float(similarity),
        weakest=weakest,
        sounds=sounds,
        target_ll=m.log_likelihood,
        flags=flags,
    )
