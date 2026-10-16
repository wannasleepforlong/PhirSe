"""Background worker: score pending attempts with the acoustic model and write clarity back.

Usage (from verifier/):
    python -m phirse_verifier.worker            # poll forever
    python -m phirse_verifier.worker --once     # one batch, then exit
    python -m phirse_verifier.worker --file a.wav --target कप   # score one local file, no database

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
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

from . import speaker
from .audio import analyse, read_wav
from .backend import Backend, load_backend
from .score import score_attempt
from .supa import Supa, load_env

MAX_TRIES = 3
BATCH = 8


def score_audio(backend: Backend, data: bytes, forms: list[str]) -> tuple[dict, np.ndarray]:
    wav = read_wav(data)
    quality = analyse(wav)
    post = backend.posteriors(wav)
    clarity = score_attempt(post.logp, post.vocab, post.frame_s, forms, quality)
    result = clarity.to_dict()
    result["quality"] = quality.to_dict()
    result["model"] = backend.name
    return result | {"_target_ll": clarity.target_ll}, wav


class Worker:
    def __init__(self, backend: Backend, db: Supa, sid: "speaker.SpeakerModel | None"):
        self.backend = backend
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
            result, wav = score_audio(self.backend, data, forms)
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
            return "done"
        except Exception:
            traceback.print_exc()
            tries = (a.get("verifier_attempts") or 0) + 1
            self.db.update(
                "attempt",
                {"id": a["id"]},
                {"verifier_attempts": tries, "verifier_status": "failed" if tries >= MAX_TRIES else "pending"},
            )
            return "failed"

    def run(self, once: bool, interval: float) -> None:
        while True:
            batch = self.pending()
            for a in batch:
                started = time.perf_counter()
                status = self.process(a)
                print(f"{a['id']}  {status}  {1000 * (time.perf_counter() - started):.0f} ms", flush=True)
            if once:
                return
            if not batch:
                time.sleep(interval)


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description="PhirSe clarity verifier")
    p.add_argument("--once", action="store_true", help="process one batch and exit")
    p.add_argument("--interval", type=float, default=5.0, help="seconds between polls when idle")
    p.add_argument("--file", help="score a local WAV instead of the database")
    p.add_argument("--target", help="target word(s) for --file, comma separated")
    p.add_argument("--backend", default=os.environ.get("VERIFIER_BACKEND", "indicconformer"))
    args = p.parse_args(argv)

    load_env(Path(__file__).resolve().parents[2] / ".env")
    backend = load_backend(args.backend)

    if args.file:
        if not args.target:
            p.error("--target is required with --file")
        result, _ = score_audio(backend, Path(args.file).read_bytes(), [t.strip() for t in args.target.split(",")])
        result.pop("_target_ll", None)
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 0

    sid = speaker.SpeakerModel() if os.environ.get("SID_ENABLED", "").lower() == "true" else None
    Worker(backend, Supa(), sid).run(args.once, args.interval)
    return 0


if __name__ == "__main__":
    sys.exit(main())
