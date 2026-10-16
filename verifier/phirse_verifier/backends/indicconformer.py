"""AI4Bharat IndicConformer 600M (multilingual) as a CTC posterior source.

Loads only what clarity scoring needs: the TorchScript feature preprocessor, the ONNX encoder and
the ONNX CTC head. The RNNT decoder and its 22 per-language heads are never loaded, which keeps
memory use within reach of an 8 GB laptop.

Mirrors the model's own `_ctc_decode`: CTC log-probs are sliced with the language mask, then
renormalised with log-softmax. The blank is the last entry of the language vocabulary.
"""

from __future__ import annotations

import json
import os
from pathlib import Path

import numpy as np

from ..backend import Posteriors
from ..score import Vocab

REPO = "ai4bharat/indic-conformer-600m-multilingual"


def model_dir() -> Path:
    from huggingface_hub import snapshot_download

    token = os.environ.get("HF_TOKEN") or None
    # Use the local copy when it is complete; otherwise fetch (gated: needs an accepted account).
    # RNNT decoder and joint heads are never loaded here, so never downloaded either.
    skip = ["assets/rnnt_decoder.onnx", "assets/joint_*.onnx"]
    try:
        return Path(snapshot_download(REPO, token=token, local_files_only=True, ignore_patterns=skip))
    except Exception:
        return Path(snapshot_download(REPO, token=token, ignore_patterns=skip))


class IndicConformer:
    name = "indic-conformer-600m-ctc"

    def __init__(self, language: str = "hi", threads: int | None = None):
        import onnxruntime as ort
        import torch

        self._torch = torch
        root = model_dir()
        cfg = json.loads((root / "config.json").read_text(encoding="utf-8"))
        vocab = json.loads((root / "assets" / "vocab.json").read_text(encoding="utf-8"))
        masks = json.loads((root / "assets" / "language_masks.json").read_text(encoding="utf-8"))
        if language not in vocab:
            raise ValueError(f"language {language!r} not in model")

        self.blank = int(cfg.get("BLANK_ID", 256))
        self.frame_s = float(cfg.get("FRAME_DURATION_MS", 0.08))  # the field holds seconds per frame
        self.mask = np.asarray(masks[language])
        self.vocab = Vocab(vocab[language], blank=self.blank)

        opts = ort.SessionOptions()
        opts.intra_op_num_threads = threads or max(1, (os.cpu_count() or 2) - 1)
        providers = ["CPUExecutionProvider"]
        self.pre = torch.jit.load(str(root / "assets" / "preprocessor.ts"), map_location="cpu")
        self.encoder = ort.InferenceSession(str(root / "assets" / "encoder.onnx"), opts, providers=providers)
        self.ctc = ort.InferenceSession(str(root / "assets" / "ctc_decoder.onnx"), opts, providers=providers)

    def posteriors(self, wav: np.ndarray) -> Posteriors:
        torch = self._torch
        x = torch.from_numpy(wav.astype(np.float32)).unsqueeze(0)
        with torch.no_grad():
            feats, length = self.pre(input_signal=x, length=torch.tensor([x.shape[-1]]))
        enc, enc_len = self.encoder.run(
            ["outputs", "encoded_lengths"], {"audio_signal": feats.numpy(), "length": length.numpy()}
        )
        logits = self.ctc.run(["logprobs"], {"encoder_output": enc})[0]  # (1, T, V_all)
        lp = logits[0, : int(enc_len[0]), :][:, self.mask]
        lp = lp - lp.max(axis=1, keepdims=True)
        lp = lp - np.log(np.exp(lp).sum(axis=1, keepdims=True))
        return Posteriors(lp.astype(np.float64), self.vocab, self.frame_s)
