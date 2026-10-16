"""Recording quality and speech timing from the waveform alone. Pure numpy, no model needed.

These numbers answer "could anyone have heard this clearly?" (too quiet, noisy, clipped) and
"how did the word come out?" (onset delay, pauses inside the attempt, length of speech).
"""

from __future__ import annotations

import io
import wave
from dataclasses import asdict, dataclass

import numpy as np

SAMPLE_RATE = 16000
FRAME = 400  # 25 ms
HOP = 160  # 10 ms


def read_wav(data: bytes) -> np.ndarray:
    """Decode 16-bit PCM WAV (as uploaded by the browser) to mono float32 at 16 kHz."""
    with wave.open(io.BytesIO(data)) as w:
        sr, ch, width, n = w.getframerate(), w.getnchannels(), w.getsampwidth(), w.getnframes()
        raw = w.readframes(n)
    if width != 2:
        raise ValueError(f"expected 16-bit PCM, got {8 * width}-bit")
    x = np.frombuffer(raw, dtype="<i2").astype(np.float32) / 32768.0
    if ch > 1:
        x = x.reshape(-1, ch).mean(axis=1)
    if sr != SAMPLE_RATE:
        # Linear resample is enough for short speech clips; the browser already sends 16 kHz.
        dur = len(x) / sr
        t_new = np.linspace(0, dur, int(dur * SAMPLE_RATE), endpoint=False)
        x = np.interp(t_new, np.arange(len(x)) / sr, x).astype(np.float32)
    return x


def frame_energy_db(x: np.ndarray) -> np.ndarray:
    if len(x) < FRAME:
        x = np.pad(x, (0, FRAME - len(x)))
    n = 1 + (len(x) - FRAME) // HOP
    idx = np.arange(FRAME)[None, :] + HOP * np.arange(n)[:, None]
    rms = np.sqrt((x[idx] ** 2).mean(axis=1) + 1e-12)
    return 20 * np.log10(rms + 1e-12)


@dataclass
class AudioQuality:
    duration_s: float
    loudness_dbfs: float  # mean level of speech frames
    noise_dbfs: float  # level of the quietest frames (room noise floor)
    snr_db: float
    clipped_ratio: float  # share of samples at full scale
    speech_s: float  # seconds of speech frames
    onset_s: float  # silence before speech starts
    longest_pause_s: float  # longest silence between first and last speech frame
    pause_ratio: float  # share of the spoken span that is silence
    flags: list[str]

    def to_dict(self) -> dict:
        return {k: (round(v, 3) if isinstance(v, float) else v) for k, v in asdict(self).items()}


def analyse(x: np.ndarray) -> AudioQuality:
    e = frame_energy_db(x)
    hop_s = HOP / SAMPLE_RATE
    noise = float(np.percentile(e, 10))
    peak = float(np.percentile(e, 95))
    # Speech = frames clearly above the noise floor (halfway to the loudest frames, at least 3 dB),
    # but never below an absolute -50 dBFS gate so a silent room is not mistaken for speech.
    threshold = max(noise + max(3.0, 0.5 * (peak - noise)), -50.0)
    speech = e > threshold
    idx = np.where(speech)[0]

    if len(idx) == 0:
        flags = ["no_speech"]
        if peak < -45:
            flags.append("too_quiet")
        if noise > -40:
            flags.append("noisy")
        return AudioQuality(len(x) / SAMPLE_RATE, peak, noise, 0.0, 0.0, 0.0, len(x) / SAMPLE_RATE, 0.0, 0.0, flags)

    first, last = int(idx[0]), int(idx[-1])
    span = speech[first : last + 1]
    longest, run = 0, 0
    for s in span:
        run = 0 if s else run + 1
        longest = max(longest, run)

    loud = float(e[speech].mean())
    snr = loud - noise
    clipped = float((np.abs(x) >= 0.999).mean())

    flags: list[str] = []
    if loud < -38:
        flags.append("too_quiet")
    if snr < 12:
        flags.append("noisy")
    if clipped > 0.002:
        flags.append("clipped")
    if speech.sum() * hop_s < 0.15:
        flags.append("too_short")

    return AudioQuality(
        duration_s=len(x) / SAMPLE_RATE,
        loudness_dbfs=loud,
        noise_dbfs=noise,
        snr_db=snr,
        clipped_ratio=clipped,
        speech_s=float(speech.sum() * hop_s),
        onset_s=first * hop_s,
        longest_pause_s=longest * hop_s,
        pause_ratio=float(1 - span.mean()),
        flags=flags,
    )
