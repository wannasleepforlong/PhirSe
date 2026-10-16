import io
import wave

import numpy as np

from phirse_verifier.backend import Posteriors
from phirse_verifier.score import Vocab
from phirse_verifier.worker import Worker

TOKENS = ["<blank>", "▁क", "प"]


class FakeBackend:
    """Pretends the audio clearly says कप."""

    name = "fake"

    def posteriors(self, wav):
        rows = [{0: 0.9}, {1: 0.95}, {1: 0.95}, {0: 0.9}, {2: 0.95}, {0: 0.9}]
        out = np.full((len(rows), len(TOKENS)), 1e-6)
        for t, row in enumerate(rows):
            for k, p in row.items():
                out[t, k] = p
        out /= out.sum(axis=1, keepdims=True)
        return Posteriors(np.log(out), Vocab(TOKENS, 0), 0.04)


def wav_bytes() -> bytes:
    sr = 16000
    t = np.arange(int(0.8 * sr)) / sr
    x = np.concatenate([np.zeros(3200), 0.2 * np.sin(2 * np.pi * 220 * t[: int(0.4 * sr)]), np.zeros(3200)])
    x = x + 0.0005 * np.random.default_rng(0).standard_normal(len(x))
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes((x * 32767).astype("<i2").tobytes())
    return buf.getvalue()


class FakeDb:
    def __init__(self):
        self.updates = []

    def download(self, bucket, path):
        assert bucket == "audio"
        return wav_bytes()

    def update(self, table, match, values):
        self.updates.append((table, match, values))

    def select(self, table, params):
        return []

    def upsert(self, table, row):
        pass


def attempt(**kw):
    base = {
        "id": "a1",
        "audio_path": "attempts/p/s/a1.wav",
        "verifier_attempts": 0,
        "live_score": "uncertain",
        "slp_label": None,
        "session": {"patient_id": "p"},
        "word_item": {"target_deva": "कप", "accepted_forms": ["kap", "cup"]},
    }
    base.update(kw)
    return base


def test_process_writes_clarity_without_touching_live_score():
    db = FakeDb()
    status = Worker(FakeBackend(), db, None).process(attempt())
    assert status == "done"
    table, match, values = db.updates[-1]
    assert table == "attempt" and match == {"id": "a1"}
    assert values["verifier_status"] == "done"
    assert values["verifier_verdict"] == "match"
    assert values["verifier_transcript"] == "कप"
    assert values["clarity"]["clarity"] >= 80
    assert "quality" in values["clarity"]
    assert "live_score" not in values


def test_attempt_without_audio_is_skipped():
    db = FakeDb()
    assert Worker(FakeBackend(), db, None).process(attempt(audio_path=None)) == "skipped"
    assert db.updates[-1][2] == {"verifier_status": "skipped"}


def test_failures_retry_then_fail():
    class Broken(FakeBackend):
        def posteriors(self, wav):
            raise RuntimeError("model crashed")

    db = FakeDb()
    w = Worker(Broken(), db, None)
    assert w.process(attempt(verifier_attempts=0)) == "failed"
    assert db.updates[-1][2] == {"verifier_attempts": 1, "verifier_status": "pending"}
    w.process(attempt(verifier_attempts=2))
    assert db.updates[-1][2] == {"verifier_attempts": 3, "verifier_status": "failed"}
