import numpy as np

from phirse_verifier.speaker import MIN_SAMPLES, check, cosine, update_print


def test_cosine_basics():
    a = np.array([1.0, 0.0])
    assert cosine(a, a) == 1.0
    assert abs(cosine(a, np.array([0.0, 1.0]))) < 1e-9
    assert cosine(a, np.zeros(2)) == 0.0


def test_voice_print_needs_enough_samples_before_judging():
    rng = np.random.default_rng(1)
    voice = rng.standard_normal(16)
    p, n = None, 0
    for _ in range(MIN_SAMPLES - 1):
        p, n = update_print(p, n, voice + 0.1 * rng.standard_normal(16))
        assert check(p, n, voice)[1] is False
    p, n = update_print(p, n, voice)
    sim_same, ready = check(p, n, voice + 0.1 * rng.standard_normal(16))
    sim_other, _ = check(p, n, rng.standard_normal(16))
    assert ready
    assert sim_same is not None and sim_same > 0.9
    assert sim_other is not None and sim_other < sim_same
