import numpy as np

from phirse_verifier.audio import AudioQuality
from phirse_verifier.score import Vocab, is_devanagari, score_attempt

# Tiny SentencePiece-like vocab: blank, word-start pieces, and inner pieces.
TOKENS = ["<blank>", "▁क", "प", "▁च", "ाय", "ब", "▁पा", "नी"]
V = Vocab(TOKENS, blank=0)


def quality(**kw) -> AudioQuality:
    base = dict(
        duration_s=1.0, loudness_dbfs=-20.0, noise_dbfs=-60.0, snr_db=40.0, clipped_ratio=0.0,
        speech_s=0.5, onset_s=0.2, longest_pause_s=0.0, pause_ratio=0.0, flags=[],
    )
    base.update(kw)
    return AudioQuality(**base)


def frames_for(tokens: list[str], *rows: dict[int, float]) -> np.ndarray:
    out = np.full((len(rows), len(tokens)), 1e-6)
    for t, row in enumerate(rows):
        for tok, p in row.items():
            out[t, tok] = p
    out /= out.sum(axis=1, keepdims=True)
    return np.log(out)


def frames(*rows: dict[int, float]) -> np.ndarray:
    out = np.full((len(rows), len(TOKENS)), 1e-6)
    for t, row in enumerate(rows):
        for tok, p in row.items():
            out[t, tok] = p
    out /= out.sum(axis=1, keepdims=True)
    return np.log(out)


def test_vocab_encode_prefers_word_start_pieces_and_decodes():
    assert V.encode("कप") == [1, 2]
    assert V.encode("चाय") == [3, 4]
    assert V.encode("xyz") is None
    assert V.decode([1, 2]) == "कप"


def test_encode_variants_lists_every_split_longest_first():
    v = Vocab(["<b>", "▁च", "ाय", "ा", "य", "स्त", "स", "्", "त", "▁ब", "ि"], blank=0)
    assert v.encode_variants("चाय") == [[1, 2], [1, 3, 4]]
    assert v.encode_variants("बिस्त") == [[9, 10, 5], [9, 10, 6, 7, 8]]


def test_nukta_free_spelling_is_accepted_but_reported_as_the_original_form():
    toks = ["<b>", "▁फ", "ो", "न", "़"]
    lp = frames_for(toks, {0: 0.9}, {1: 0.95}, {0: 0.9}, {2: 0.95}, {3: 0.95}, {0: 0.9})
    c = score_attempt(lp, Vocab(toks, 0), 0.04, ["फ़ोन"], quality())
    assert c.verdict == "match" and c.form == "फ़ोन"
    assert c.similarity == 1.0


def test_is_devanagari():
    assert is_devanagari("कप") and not is_devanagari("cup")


def test_clear_cup_is_a_match_with_high_clarity():
    lp = frames({0: 0.9}, {1: 0.95}, {1: 0.95}, {0: 0.9}, {2: 0.95}, {0: 0.9})
    c = score_attempt(lp, V, 0.04, ["कप", "kap", "cup"], quality())
    assert c.verdict == "match"
    assert c.form == "कप"
    assert c.heard == "कप"
    assert c.clarity >= 85
    assert c.weakest is None
    assert [s.unit for s in c.sounds] == ["क", "प"]


def test_phonemic_error_kab_is_not_a_match_and_names_the_weak_sound():
    # Says क then ब instead of प.
    lp = frames({0: 0.9}, {1: 0.95}, {1: 0.95}, {0: 0.9}, {5: 0.9, 2: 0.08}, {0: 0.9})
    c = score_attempt(lp, V, 0.04, ["कप"], quality())
    assert c.verdict != "match"
    assert c.weakest == "प"
    assert c.heard == "कब"
    assert c.clarity < 70


def test_picks_the_best_accepted_form():
    lp = frames({0: 0.9}, {6: 0.95}, {0: 0.9}, {7: 0.95}, {0: 0.9})
    c = score_attempt(lp, V, 0.04, ["कप", "पानी"], quality())
    assert c.form == "पानी" and c.verdict == "match"


def test_noisy_recording_and_long_pause_lower_clarity_but_not_the_verdict():
    lp = frames({0: 0.9}, {1: 0.95}, {0: 0.9}, {2: 0.95}, {0: 0.9})
    clean = score_attempt(lp, V, 0.04, ["कप"], quality())
    rough = score_attempt(lp, V, 0.04, ["कप"], quality(snr_db=8.0, longest_pause_s=1.5, flags=["noisy"]))
    assert rough.verdict == clean.verdict == "match"
    assert rough.clarity < clean.clarity
    assert "noisy" in rough.flags


def test_no_speech_scores_zero():
    lp = frames({0: 0.99}, {0: 0.99})
    c = score_attempt(lp, V, 0.04, ["कप"], quality(flags=["no_speech"], snr_db=0.0))
    assert c.verdict == "no_speech" and c.clarity == 0


def test_roman_only_forms_are_reported_not_crashed():
    lp = frames({0: 0.9}, {1: 0.95}, {0: 0.9})
    c = score_attempt(lp, V, 0.04, ["cup"], quality())
    assert "target_not_in_vocab" in c.flags
