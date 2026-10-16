import io
import wave

import numpy as np

from phirse_verifier.audio import SAMPLE_RATE, analyse, read_wav

rng = np.random.default_rng(0)


def tone(seconds: float, amp: float, freq: float = 220.0) -> np.ndarray:
    t = np.arange(int(seconds * SAMPLE_RATE)) / SAMPLE_RATE
    # A vowel-like harmonic sound, not a pure sine.
    return (amp * (np.sin(2 * np.pi * freq * t) + 0.5 * np.sin(4 * np.pi * freq * t))).astype(np.float32)


def silence(seconds: float, noise: float = 0.001) -> np.ndarray:
    return (noise * rng.standard_normal(int(seconds * SAMPLE_RATE))).astype(np.float32)


def to_wav(x: np.ndarray, sr: int = SAMPLE_RATE) -> bytes:
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes((np.clip(x, -1, 1) * 32767).astype("<i2").tobytes())
    return buf.getvalue()


def test_read_wav_roundtrip_and_resample():
    x = tone(0.5, 0.3)
    y = read_wav(to_wav(x))
    assert len(y) == len(x)
    z = read_wav(to_wav(tone(0.5, 0.3), sr=8000)[:])  # header says 8 kHz
    assert abs(len(z) - 0.5 * 8000 * 2) < 5 or abs(len(z) - SAMPLE_RATE * 0.5 * 2) < 20


def test_clean_word_has_no_flags_and_measures_onset_and_pause():
    x = np.concatenate([silence(0.6), tone(0.3, 0.2), silence(0.4), tone(0.3, 0.2), silence(0.3)])
    q = analyse(x)
    assert q.flags == []
    assert 0.5 < q.onset_s < 0.7
    assert 0.3 < q.longest_pause_s < 0.5
    assert q.snr_db > 30
    assert 0.5 < q.speech_s < 0.7


def test_quiet_noisy_and_clipped_recordings_are_flagged():
    quiet = analyse(np.concatenate([silence(0.3, 0.0002), tone(0.5, 0.004), silence(0.3, 0.0002)]))
    assert "too_quiet" in quiet.flags
    noisy = analyse(np.concatenate([silence(0.4, 0.05), tone(0.4, 0.08) + silence(0.4, 0.05), silence(0.4, 0.05)]))
    assert "noisy" in noisy.flags
    clipped = analyse(np.concatenate([silence(0.3), np.clip(tone(0.5, 2.0), -1, 1), silence(0.3)]))
    assert "clipped" in clipped.flags


def test_silence_only_is_no_speech():
    assert "no_speech" in analyse(silence(1.0)).flags
