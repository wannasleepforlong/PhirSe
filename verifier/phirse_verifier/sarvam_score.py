"""Clarity from Sarvam's language detection. Pure functions, no network.

Signals:
- Hindi confidence: `language_probability` when Sarvam detected Hindi; when it detected another
  language, a low value (mumbled or unclear Hindi often gets read as some other language).
  English counts half-way, because Hindi speakers often say everyday words in English (cup, TV).
- Word match: does the auto-language transcript contain the target or an accepted spelling.
- Recording quality and pauses from the waveform (audio.py).

Measured on clean and degraded recordings: noise alone barely lowers language_probability, so
this is a coarse signal. Answers it cannot settle go to the IndicConformer backup.
"""

from __future__ import annotations

import re
import unicodedata

from .audio import AudioQuality
from .ctc import edit_distance
from .score import Clarity, without_nukta
from .sarvam import Detection

HINDI = "hi-IN"
ENGLISH = "en-IN"

MATCH_CONFIDENCE = 0.6  # Hindi confidence needed for a confident "match"


def normalise(text: str) -> str:
    t = unicodedata.normalize("NFC", without_nukta(text)).lower()
    t = t.replace("ँ", "ं")  # chandrabindu -> anusvara
    t = re.sub(r"[^\w\sऀ-ॿ]|[।॥]", " ", t)
    return re.sub(r"\s+", " ", t).strip()


def hindi_confidence(d: Detection) -> float | None:
    if d.language_probability is None or not d.language_code:
        return None
    p = max(0.0, min(1.0, d.language_probability))
    if d.language_code == HINDI:
        return p
    if d.language_code == ENGLISH:
        return 0.5 * p
    return 0.3 * (1.0 - p)


def word_match(transcript: str, forms: list[str]) -> float:
    """1.0 exact word found, 0.5 a word sharing at least half its letters (near miss), else 0."""
    tokens = normalise(transcript).split()
    if not tokens:
        return 0.0
    best = 0.0
    for form in forms:
        f = normalise(form)
        if not f:
            continue
        n = len(f.split())
        for i in range(len(tokens) - n + 1):
            window = " ".join(tokens[i : i + n])
            if window == f:
                return 1.0
            longest = max(len(window), len(f))
            if len(f) >= 2 and 1 - edit_distance(list(window), list(f)) / longest >= 0.5:
                best = max(best, 0.5)
    return best


def score_sarvam(d: Detection, forms: list[str], quality: AudioQuality) -> Clarity:
    flags = list(quality.flags)
    recording = max(0.0, min(1.0, (quality.snr_db - 6.0) / 24.0))
    fluency = 1.0 - 0.6 * max(0.0, min(1.0, quality.longest_pause_s / 1.5))
    if "no_speech" in flags or not d.transcript.strip():
        return Clarity(0, 0.0, 0.0, fluency, recording, "no_speech", None, d.transcript, 0.0, None, [], None, flags)

    match = word_match(d.transcript, forms)
    form = next((f for f in forms if word_match(d.transcript, [f]) == match and match > 0), None)
    conf = hindi_confidence(d)
    if conf is None:
        flags.append("no_language_probability")
        conf = 0.5
    elif match == 1.0 and d.language_code == ENGLISH and d.language_probability is not None:
        conf = d.language_probability  # an accepted English word (cup, TV) said clearly

    if match == 1.0 and (conf >= MATCH_CONFIDENCE or d.language_code == ENGLISH):
        verdict = "match"
    elif match > 0:
        verdict = "close"
    else:
        verdict = "no_match"

    # How clear the speech was, whatever the word; then scaled by whether it was the target word.
    speech = 0.7 * conf + 0.15 * fluency + 0.15 * recording
    clarity = round(100 * speech * (1.0 if match == 1.0 else 0.5 if match > 0 else 0.2))
    return Clarity(
        clarity=int(max(0, min(100, clarity))),
        word_match=match,
        articulation=conf,
        fluency=fluency,
        recording=recording,
        verdict=verdict,
        form=form,
        heard=d.transcript,
        similarity=match,
        weakest=None,
        sounds=[],
        target_ll=None,
        flags=flags,
        speech_clarity=int(round(100 * speech)),
    )


def needs_backup(c: Clarity, live_score: str | None) -> bool:
    """Send to IndicConformer only when Sarvam cannot settle an answer the live check left open."""
    if c.verdict == "no_speech":
        return False
    if live_score == "uncertain" and c.verdict != "match":
        return True
    if live_score == "correct" and c.verdict == "no_match":
        return True  # disagreement with the live check: get a second opinion
    return False
