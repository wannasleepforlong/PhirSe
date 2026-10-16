from phirse_verifier.audio import AudioQuality
from phirse_verifier.sarvam import Detection
from phirse_verifier.sarvam_score import hindi_confidence, needs_backup, normalise, score_sarvam, word_match


def quality(**kw) -> AudioQuality:
    base = dict(
        duration_s=1.0, loudness_dbfs=-20.0, noise_dbfs=-60.0, snr_db=40.0, clipped_ratio=0.0,
        speech_s=0.5, onset_s=0.2, longest_pause_s=0.0, pause_ratio=0.0, flags=[],
    )
    base.update(kw)
    return AudioQuality(**base)


def test_hindi_confidence_rewards_hindi_and_discounts_other_languages():
    assert hindi_confidence(Detection("पानी", "hi-IN", 0.98)) == 0.98
    assert hindi_confidence(Detection("cup", "en-IN", 0.6)) == 0.3
    assert hindi_confidence(Detection("ஓகே", "ta-IN", 0.8)) < 0.1
    assert hindi_confidence(Detection("x", None, None)) is None


def test_normalise_and_word_match():
    assert normalise("दरवाज़ा।") == "दरवाजा"
    assert word_match("मेरा कप", ["कप"]) == 1.0
    assert word_match("Cup.", ["कप", "cup"]) == 1.0
    assert word_match("चाहे", ["चाय"]) == 0.5
    assert word_match("बिस्तर", ["कप"]) == 0.0


def test_clear_hindi_word_is_a_match():
    c = score_sarvam(Detection("पानी", "hi-IN", 0.98), ["पानी", "paani"], quality())
    assert c.verdict == "match" and c.clarity >= 85 and c.form == "पानी"


def test_english_word_said_for_the_item_still_counts():
    c = score_sarvam(Detection("Cup.", "en-IN", 0.52), ["कप", "cup"], quality())
    assert c.verdict == "match"
    assert c.clarity < 85  # lower Hindi confidence shows in clarity


def test_clear_wrong_word_has_clear_speech_but_low_word_clarity():
    c = score_sarvam(Detection("बिस्तर", "hi-IN", 0.99), ["गिलास"], quality())
    assert c.verdict == "no_match"
    assert c.speech_clarity >= 90
    assert c.clarity <= 20


def test_mumble_read_as_another_language_scores_low():
    c = score_sarvam(Detection("ஓகே", "ta-IN", 0.82), ["पानी"], quality())
    assert c.verdict == "no_match" and c.clarity < 30


def test_near_miss_is_close_and_goes_to_backup_when_live_was_uncertain():
    c = score_sarvam(Detection("चाहे", "hi-IN", 0.99), ["चाय", "chai"], quality())
    assert c.verdict == "close"
    assert needs_backup(c, "uncertain") is True
    assert needs_backup(c, "not_yet") is False


def test_backup_rules():
    match = score_sarvam(Detection("पानी", "hi-IN", 0.98), ["पानी"], quality())
    miss = score_sarvam(Detection("बिस्तर", "hi-IN", 0.98), ["पानी"], quality())
    assert needs_backup(match, "uncertain") is False
    assert needs_backup(miss, "correct") is True
    assert needs_backup(miss, "not_yet") is False


def test_silence_is_no_speech_and_never_escalates():
    c = score_sarvam(Detection("", None, None), ["पानी"], quality(flags=["no_speech"]))
    assert c.verdict == "no_speech" and not needs_backup(c, "uncertain")
