"""CTC scoring of one spoken attempt against a known target word.

Pure numpy. Input is a (T, V) matrix of per-frame log-probabilities from any CTC acoustic model
(blank = index ``blank``). Nothing here knows which model produced it.

The idea follows naming-verification research (NUVA, goodness-of-pronunciation): instead of trusting
a free transcript, ask how much the audio supports the *known* target compared with the model's own
best guess, and which parts of the word the audio supports weakly.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

NEG_INF = -1e30


def log_softmax(logits: np.ndarray) -> np.ndarray:
    m = logits.max(axis=-1, keepdims=True)
    z = logits - m
    return z - np.log(np.exp(z).sum(axis=-1, keepdims=True))


def _logsumexp(a: float, b: float) -> float:
    if a < b:
        a, b = b, a
    if b <= NEG_INF / 2:
        return a
    return a + float(np.log1p(np.exp(b - a)))


def greedy_decode(logp: np.ndarray, blank: int) -> tuple[list[int], float]:
    """Best-path decode: argmax per frame, collapse repeats, drop blanks.

    Returns the token ids and the log-probability of that single best frame path.
    """
    best = logp.argmax(axis=1)
    path_logp = float(logp[np.arange(len(best)), best].sum())
    tokens: list[int] = []
    prev = -1
    for t in best:
        t = int(t)
        if t != prev and t != blank:
            tokens.append(t)
        prev = t
    return tokens, path_logp


def ctc_log_likelihood(logp: np.ndarray, target: list[int], blank: int) -> float:
    """log P(target | audio) summed over all CTC alignments (forward algorithm)."""
    T = logp.shape[0]
    if not target:
        return float(logp[:, blank].sum())
    ext = [blank]
    for tok in target:
        ext += [tok, blank]
    S = len(ext)
    if T < len(target):
        return NEG_INF

    alpha = np.full(S, NEG_INF)
    alpha[0] = logp[0, ext[0]]
    alpha[1] = logp[0, ext[1]]
    for t in range(1, T):
        prev = alpha
        alpha = np.full(S, NEG_INF)
        for s in range(S):
            a = prev[s]
            if s >= 1:
                a = _logsumexp(a, prev[s - 1])
            if s >= 2 and ext[s] != blank and ext[s] != ext[s - 2]:
                a = _logsumexp(a, prev[s - 2])
            if a > NEG_INF / 2:
                alpha[s] = a + logp[t, ext[s]]
    return _logsumexp(alpha[S - 1], alpha[S - 2])


@dataclass
class AlignedToken:
    token: int
    start: int  # first frame (inclusive)
    end: int  # last frame (exclusive)
    score: float  # mean posterior of the token over its frames, 0..1


def forced_align(logp: np.ndarray, target: list[int], blank: int) -> list[AlignedToken] | None:
    """Viterbi CTC alignment of the target. Returns one span per target token, or None if impossible."""
    T = logp.shape[0]
    if not target or T < len(target):
        return None
    ext = [blank]
    for tok in target:
        ext += [tok, blank]
    S = len(ext)

    dp = np.full((T, S), NEG_INF)
    back = np.zeros((T, S), dtype=np.int64)
    dp[0, 0] = logp[0, ext[0]]
    dp[0, 1] = logp[0, ext[1]]
    for t in range(1, T):
        for s in range(S):
            best, arg = dp[t - 1, s], s
            if s >= 1 and dp[t - 1, s - 1] > best:
                best, arg = dp[t - 1, s - 1], s - 1
            if s >= 2 and ext[s] != blank and ext[s] != ext[s - 2] and dp[t - 1, s - 2] > best:
                best, arg = dp[t - 1, s - 2], s - 2
            if best > NEG_INF / 2:
                dp[t, s] = best + logp[t, ext[s]]
                back[t, s] = arg

    s = S - 1 if dp[T - 1, S - 1] >= dp[T - 1, S - 2] else S - 2
    if dp[T - 1, s] <= NEG_INF / 2:
        return None
    states = np.zeros(T, dtype=np.int64)
    for t in range(T - 1, -1, -1):
        states[t] = s
        s = back[t, s]

    spans: list[AlignedToken] = []
    probs = np.exp(logp)
    for k, tok in enumerate(target):
        frames = np.where(states == 2 * k + 1)[0]
        if len(frames) == 0:
            return None
        start, end = int(frames[0]), int(frames[-1]) + 1
        spans.append(AlignedToken(tok, start, end, float(probs[start:end, tok].mean())))
    return spans


@dataclass
class TargetMatch:
    tokens: list[int]
    log_likelihood: float
    best_path_logp: float
    match: float  # 0..1, how strongly the audio supports the target vs the model's own best guess
    alignment: list[AlignedToken] | None


def target_match(logp: np.ndarray, target: list[int], blank: int) -> TargetMatch:
    """Goodness-of-pronunciation style score for one target token sequence.

    match = exp((log P(target) - log P(best path)) / n_tokens), clipped to [0, 1].
    1.0 means the target is as likely as anything the model would have said on its own.
    Dividing by the number of tokens keeps long and short words comparable.
    """
    ll = ctc_log_likelihood(logp, target, blank)
    _, best = greedy_decode(logp, blank)
    n = max(1, len(target))
    m = float(np.exp(min(0.0, (ll - best) / n))) if ll > NEG_INF / 2 else 0.0
    return TargetMatch(target, ll, best, m, forced_align(logp, target, blank))


def edit_distance(a: list, b: list) -> int:
    prev = list(range(len(b) + 1))
    for i in range(1, len(a) + 1):
        cur = [i] + [0] * len(b)
        for j in range(1, len(b) + 1):
            cur[j] = min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] != b[j - 1]))
        prev = cur
    return prev[-1]
