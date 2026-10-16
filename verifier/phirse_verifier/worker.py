"""Background worker: score pending attempts and write clarity back.

Order of work for each answer:
1. Recording quality from the waveform (no network).
2. Sarvam speech-to-text with automatic language detection: clarity from `language_probability`,
   the detected language and whether the transcript contains the word. One cheap API call.
3. Only if Sarvam cannot settle an answer the live check left open (see `needs_backup`), or the
   Sarvam call fails: the IndicConformer acoustic model, loaded on first use. Most runs never load it.

Usage (from verifier/):
    python -m phirse_verifier.worker            # poll forever
    python -m phirse_verifier.worker --once     # one batch, then exit
    python -m phirse_verifier.worker --file a.wav --target कप [--live uncertain]   # one local file

Never touches the live score: it fills clarity, verifier_* and (optionally) speaker_similarity.
If it is not running, attempts stay "pending" and the app works exactly the same.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
import traceback
from collections.abc import Callable
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

from . import speaker
from .audio import analyse, read_wav
from .backend import Backend, load_backend
from .sarvam import Detection, detect
from .sarvam_score import needs_backup, score_sarvam
from .score import score_attempt
from .supa import Supa, load_env

MAX_TRIES = 3
BATCH = 8

Detector = Callable[[bytes], Detection]


class Scorer:
    """Sarvam first; IndicConformer backup created lazily by ``backup_factory`` (None = no backup)."""

    def __init__(self, detector: Detector, backup_factory: Callable[[], Backend] | None):
        self.detector = detector
        self.backup_factory = backup_factory
        self._backup: Backend | None = None

    def backup(self) -> Backend | None:
        if self._backup is None and self.backup_factory is not None:
            self._backup = self.backup_factory()
        return self._backup

    def score(self, data: bytes, forms: list[str], live_score: str | None) -> tuple[dict, np.ndarray]:
        wav = read_wav(data)
        quality = analyse(wav)

        sarvam: Detection | None = None
        result: dict | None = None
        escalate = False
        try:
            sarvam = self.detector(data)
            c = score_sarvam(sarvam, forms, quality)
            result = c.to_dict() | {"source": "sarvam", "_target_ll": None}
            escalate = needs_backup(c, live_score)
        except Exception:
            traceback.print_exc()
            escalate = True

        if escalate and (backend := self.backup()) is not None:
            post = backend.posteriors(wav)
            c = score_attempt(post.logp, post.vocab, post.frame_s, forms, quality)
            result = c.to_dict() | {"source": "indicconformer", "model": backend.name, "_target_ll": c.target_ll}
        if result is None:
            raise RuntimeError("Sarvam failed and no backup model is configured")

        result["quality"] = quality.to_dict()
        if sarvam is not None:
            result["language"] = sarvam.language_code
            result["language_probability"] = sarvam.language_probability
            result["sarvam_heard"] = sarvam.transcript
        return result, wav


class Worker:
    def __init__(self, scorer: Scorer, db: Supa, sid: "speaker.SpeakerModel | None"):
        self.scorer = scorer
        self.db = db
        self.sid = sid

    def pending(self) -> list[dict]:
        return self.db.select(
            "attempt",
            {
                "select": "id,audio_path,verifier_attempts,live_score,slp_label,session(patient_id),word_item(target_deva,accepted_forms)",
                "verifier_status": "eq.pending",
                "verifier_attempts": f"lt.{MAX_TRIES}",
                "order": "created_at.asc",
                "limit": str(BATCH),
            },
        )

    def _speaker(self, patient_id: str, wav: np.ndarray, own_voice: bool) -> float | None:
        if not self.sid:
            return None
        emb = self.sid.embed(wav)
        rows = self.db.select("speaker_profile", {"select": "embedding,samples", "patient_id": f"eq.{patient_id}"})
        current = np.array(rows[0]["embedding"], dtype=np.float32) if rows else None
        samples = rows[0]["samples"] if rows else 0
        sim, ready = speaker.check(current, samples, emb)
        # Learn the voice only from answers that are very likely the person's own.
        if own_voice and (not ready or (sim is not None and sim >= speaker.OTHER_SPEAKER_BELOW)):
            new, n = speaker.update_print(current, samples, emb)
            self.db.upsert(
                "speaker_profile",
                {"patient_id": patient_id, "embedding": new.tolist(), "samples": n, "updated_at": now()},
            )
        return sim

    def process(self, a: dict) -> str:
        word = a.get("word_item") or {}
        if not a.get("audio_path") or not word.get("target_deva"):
            self.db.update("attempt", {"id": a["id"]}, {"verifier_status": "skipped"})
            return "skipped"
        try:
            data = self.db.download("audio", a["audio_path"])
            forms = [word["target_deva"], *(word.get("accepted_forms") or [])]
            result, wav = self.scorer.score(data, forms, a.get("live_score"))
            target_ll = result.pop("_target_ll")
            patient_id = (a.get("session") or {}).get("patient_id")
            own = a.get("slp_label") == "correct" or a.get("live_score") == "correct"
            sim = self._speaker(patient_id, wav, own) if patient_id else None
            if sim is not None and sim < speaker.OTHER_SPEAKER_BELOW:
                result["flags"] = [*result["flags"], "other_speaker"]
            self.db.update(
                "attempt",
                {"id": a["id"]},
                {
                    "verifier_status": "done",
                    "verifier_score": result["word_match"],
                    "verifier_target_ll": target_ll,
                    "verifier_transcript": result["heard"],
                    "verifier_verdict": result["verdict"],
                    "clarity": result,
                    "speaker_similarity": sim,
                    "verifier_attempts": (a.get("verifier_attempts") or 0) + 1,
                    "verified_at": now(),
                },
            )
            return f"done ({result['source']})"
        except Exception:
            traceback.print_exc()
            tries = (a.get("verifier_attempts") or 0) + 1
            self.db.update(
                "attempt",
                {"id": a["id"]},
                {"verifier_attempts": tries, "verifier_status": "failed" if tries >= MAX_TRIES else "pending"},
            )
            return "failed"

    def run(self, once: bool, interval: float) -> dict[str, int]:
        counts: dict[str, int] = {}
        while True:
            batch = self.pending()
            for a in batch:
                started = time.perf_counter()
                status = self.process(a)
                counts[status] = counts.get(status, 0) + 1
                print(f"{a['id']}  {status}  {1000 * (time.perf_counter() - started):.0f} ms", flush=True)
            if not batch:
                if once:
                    return counts
                time.sleep(interval)


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def make_scorer() -> Scorer:
    backup = os.environ.get("VERIFIER_BACKUP", "indicconformer").strip().lower()
    factory = None if backup in ("", "none", "off") else (lambda: load_backend(backup))
    return Scorer(detect, factory)


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description="PhirSe clarity verifier")
    p.add_argument("--once", action="store_true", help="process all pending answers, then exit")
    p.add_argument("--interval", type=float, default=5.0, help="seconds between polls when idle")
    p.add_argument("--file", help="score a local WAV instead of the database")
    p.add_argument("--target", help="target word(s) for --file, comma separated")
    p.add_argument("--live", default=None, help="live score to assume for --file (e.g. uncertain)")
    args = p.parse_args(argv)

    load_env(Path(__file__).resolve().parents[2] / ".env")
    scorer = make_scorer()

    if args.file:
        if not args.target:
            p.error("--target is required with --file")
        result, _ = scorer.score(Path(args.file).read_bytes(), [t.strip() for t in args.target.split(",")], args.live)
        result.pop("_target_ll", None)
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 0

    sid = speaker.SpeakerModel() if os.environ.get("SID_ENABLED", "").lower() == "true" else None
    counts = Worker(scorer, Supa(), sid).run(args.once, args.interval)
    print(counts)
    return 0


if __name__ == "__main__":
    sys.exit(main())
