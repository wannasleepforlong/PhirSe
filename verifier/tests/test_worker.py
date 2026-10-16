import io
import wave

import numpy as np

from phirse_verifier.backend import Posteriors
from phirse_verifier.score import Vocab
from phirse_verifier.sarvam import Detection
from phirse_verifier.worker import Scorer, Worker

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


class CountingBackup(FakeBackend):
    loads = 0


def make(detected: Detection | None, backup=True):
    def detector(_data):
        if detected is None:
            raise RuntimeError("sarvam down")
        return detected

    def factory():
        CountingBackup.loads += 1
        return CountingBackup()

    return Scorer(detector, factory if backup else None)


def test_sarvam_alone_scores_a_clear_answer_and_never_loads_the_backup():
    CountingBackup.loads = 0
    db = FakeDb()
    status = Worker(make(Detection("कप", "hi-IN", 0.97)), db, None).process(attempt(live_score="correct"))
    assert status == "done (sarvam)"
    values = db.updates[-1][2]
    assert values["verifier_verdict"] == "match"
    assert values["clarity"]["source"] == "sarvam"
    assert values["clarity"]["language"] == "hi-IN"
    assert values["clarity"]["language_probability"] == 0.97
    assert CountingBackup.loads == 0


def test_backup_runs_only_for_open_answers_and_loads_once():
    CountingBackup.loads = 0
    db = FakeDb()
    w = Worker(make(Detection("चाहे", "hi-IN", 0.99)), db, None)
    assert w.process(attempt(live_score="uncertain")) == "done (indicconformer)"
    assert w.process(attempt(live_score="uncertain")) == "done (indicconformer)"
    assert CountingBackup.loads == 1
    assert db.updates[-1][2]["clarity"]["sarvam_heard"] == "चाहे"


def test_sarvam_failure_falls_back_to_backup():
    db = FakeDb()
    assert Worker(make(None), db, None).process(attempt()) == "done (indicconformer)"


def test_no_backup_configured_keeps_sarvam_verdict():
    db = FakeDb()
    chai = attempt(live_score="uncertain", word_item={"target_deva": "चाय", "accepted_forms": ["chai"]})
    assert Worker(make(Detection("चाहे", "hi-IN", 0.99), backup=False), db, None).process(chai) == "done (sarvam)"
    assert db.updates[-1][2]["verifier_verdict"] == "close"


def test_process_writes_clarity_without_touching_live_score():
    db = FakeDb()
    status = Worker(make(None), db, None).process(attempt())
    assert status == "done (indicconformer)"
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
    assert Worker(make(Detection("कप", "hi-IN", 0.9)), db, None).process(attempt(audio_path=None)) == "skipped"
    assert db.updates[-1][2] == {"verifier_status": "skipped"}


def test_failures_retry_then_fail():
    class Broken(FakeBackend):
        def posteriors(self, wav):
            raise RuntimeError("model crashed")

    db = FakeDb()
    w = Worker(Scorer(lambda _d: (_ for _ in ()).throw(RuntimeError("sarvam down")), Broken), db, None)
    assert w.process(attempt(verifier_attempts=0)) == "failed"
    assert db.updates[-1][2] == {"verifier_attempts": 1, "verifier_status": "pending"}
    w.process(attempt(verifier_attempts=2))
    assert db.updates[-1][2] == {"verifier_attempts": 3, "verifier_status": "failed"}
