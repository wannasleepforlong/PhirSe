"""Optional speaker check: does this attempt sound like the person who usually practises?

Useful because a family member sometimes answers for the person. Never blocks practice and never
changes a score; it only adds "may be someone else's voice" to the review.

The voice print is a running mean of embeddings from attempts the profile already accepted as
the person's own. Embeddings come from an optional speaker model (SpeechBrain ECAPA) loaded lazily.
"""

from __future__ import annotations

import numpy as np

# Below this cosine similarity an attempt is flagged. ECAPA same-speaker pairs usually score > 0.5.
OTHER_SPEAKER_BELOW = 0.35
# Voice prints need a few samples before they are trusted.
MIN_SAMPLES = 5


def cosine(a: np.ndarray, b: np.ndarray) -> float:
    na, nb = np.linalg.norm(a), np.linalg.norm(b)
    if na == 0 or nb == 0:
        return 0.0
    return float(np.dot(a, b) / (na * nb))


def update_print(current: np.ndarray | None, samples: int, new: np.ndarray) -> tuple[np.ndarray, int]:
    """Running mean of unit-normalised embeddings."""
    new = new / (np.linalg.norm(new) or 1.0)
    if current is None or samples == 0:
        return new, 1
    return (current * samples + new) / (samples + 1), samples + 1


def check(print_: np.ndarray | None, samples: int, emb: np.ndarray) -> tuple[float | None, bool]:
    """Similarity to the voice print, and whether the print is mature enough to judge."""
    if print_ is None or samples < MIN_SAMPLES:
        return None, False
    return cosine(print_, emb), True


class SpeakerModel:
    """Lazy SpeechBrain ECAPA wrapper. Import cost is only paid when SID_ENABLED=true."""

    def __init__(self) -> None:
        import torch
        from speechbrain.inference.speaker import EncoderClassifier  # type: ignore[import-not-found]

        self._torch = torch
        self._model = EncoderClassifier.from_hparams(source="speechbrain/spkrec-ecapa-voxceleb")

    def embed(self, wav: np.ndarray) -> np.ndarray:
        t = self._torch.from_numpy(wav.astype(np.float32)).unsqueeze(0)
        with self._torch.no_grad():
            e = self._model.encode_batch(t).squeeze().cpu().numpy()
        return e.astype(np.float32)
