import numpy as np

from phirse_verifier.ctc import (
    ctc_log_likelihood,
    edit_distance,
    forced_align,
    greedy_decode,
    log_softmax,
    target_match,
)

BLANK = 0


def frames(*rows: dict[int, float], vocab: int = 5) -> np.ndarray:
    """Build (T, V) log-probs from per-frame {token: prob}; remaining mass spread over other tokens."""
    out = np.full((len(rows), vocab), 1e-6)
    for t, row in enumerate(rows):
        for tok, p in row.items():
            out[t, tok] = p
    out /= out.sum(axis=1, keepdims=True)
    return np.log(out)


def test_log_softmax_rows_sum_to_one():
    lp = log_softmax(np.array([[1.0, 2.0, 3.0], [0.0, 0.0, 0.0]]))
    assert np.allclose(np.exp(lp).sum(axis=1), 1.0)


def test_greedy_collapses_repeats_and_blanks():
    lp = frames({1: 0.9}, {1: 0.9}, {0: 0.9}, {2: 0.9}, {2: 0.9}, {0: 0.9}, {2: 0.9})
    toks, _ = greedy_decode(lp, BLANK)
    assert toks == [1, 2, 2]


def test_clear_target_scores_high_and_other_word_low():
    # Audio clearly says tokens [1, 2].
    lp = frames({0: 0.9}, {1: 0.95}, {1: 0.95}, {0: 0.9}, {2: 0.95}, {2: 0.95}, {0: 0.9})
    good = target_match(lp, [1, 2], BLANK)
    bad = target_match(lp, [3, 4], BLANK)
    assert good.match > 0.8
    assert bad.match < 0.01
    assert ctc_log_likelihood(lp, [1, 2], BLANK) > ctc_log_likelihood(lp, [3, 4], BLANK)


def test_mumbled_first_sound_gets_a_low_token_score():
    # First token only weakly supported, second clear.
    lp = frames({0: 0.6, 1: 0.3, 3: 0.1}, {1: 0.35, 3: 0.35, 0: 0.3}, {0: 0.9}, {2: 0.95}, {2: 0.95}, {0: 0.9})
    m = target_match(lp, [1, 2], BLANK)
    assert m.alignment is not None
    first, second = m.alignment
    assert first.score < 0.5 < second.score
    assert first.end <= second.start


def test_forced_align_spans_cover_tokens_in_order():
    lp = frames({1: 0.9}, {1: 0.9}, {0: 0.9}, {2: 0.9}, {3: 0.9}, {3: 0.9})
    spans = forced_align(lp, [1, 2, 3], BLANK)
    assert spans is not None
    assert [s.token for s in spans] == [1, 2, 3]
    assert spans[0].start == 0 and spans[-1].end == 6


def test_impossible_alignment_returns_none():
    lp = frames({1: 0.9})
    assert forced_align(lp, [1, 2, 3], BLANK) is None
    assert target_match(lp, [1, 2, 3], BLANK).match == 0.0


def test_repeated_token_needs_a_blank_between():
    # Target [1, 1] requires a blank between the two 1s; a single run of 1s cannot produce it.
    lp_with_gap = frames({1: 0.9}, {0: 0.9}, {1: 0.9})
    lp_no_gap = frames({1: 0.9}, {1: 0.9}, {1: 0.9})
    assert target_match(lp_with_gap, [1, 1], BLANK).match > target_match(lp_no_gap, [1, 1], BLANK).match


def test_edit_distance():
    assert edit_distance(list("kap"), list("kab")) == 1
    assert edit_distance([], [1, 2]) == 2
