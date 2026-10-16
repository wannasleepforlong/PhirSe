"""Acoustic model backends. A backend turns 16 kHz audio into per-frame CTC log-probabilities."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

import numpy as np

from .score import Vocab


@dataclass
class Posteriors:
    logp: np.ndarray  # (T, V) log-probabilities
    vocab: Vocab
    frame_s: float  # seconds per output frame


class Backend(Protocol):
    name: str

    def posteriors(self, wav: np.ndarray) -> Posteriors: ...


def load_backend(name: str = "indicconformer", language: str = "hi") -> Backend:
    if name == "indicconformer":
        from .backends.indicconformer import IndicConformer

        return IndicConformer(language=language)
    raise ValueError(f"unknown backend {name!r}")
