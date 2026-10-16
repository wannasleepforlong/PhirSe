"""Sarvam speech-to-text with automatic language detection, for background clarity scoring.

The live session always asks Sarvam for Hindi (`hi-IN`). Here we leave the language as `unknown`
so Sarvam also reports `language_code` and `language_probability`: how sure it is about which
language it heard. Clear Hindi tends to come back as `hi-IN` with high probability; mumbled or
unclear attempts often come back as some other language.
"""

from __future__ import annotations

import os
import time
from dataclasses import dataclass

import requests

STT_URL = "https://api.sarvam.ai/speech-to-text"


@dataclass
class Detection:
    transcript: str
    language_code: str | None
    language_probability: float | None


def detect(audio: bytes, model: str = "saaras:v3", session: requests.Session | None = None) -> Detection:
    key = os.environ.get("SARVAM_API_KEY")
    if not key:
        raise RuntimeError("SARVAM_API_KEY is not set")
    s = session or requests.Session()
    data = {"model": model, "language_code": "unknown"}
    if model == "saaras:v3":
        data["mode"] = "verbatim"
    delay = 0.5
    for attempt in range(5):
        r = s.post(
            STT_URL,
            headers={"api-subscription-key": key},
            files={"file": ("attempt.wav", audio, "audio/wav")},
            data=data,
            timeout=30,
        )
        if r.status_code == 429 or r.status_code >= 500:
            time.sleep(delay)
            delay *= 2
            continue
        r.raise_for_status()
        j = r.json()
        p = j.get("language_probability")
        return Detection(j.get("transcript") or "", j.get("language_code"), float(p) if p is not None else None)
    r.raise_for_status()
    raise RuntimeError("Sarvam STT kept failing")
