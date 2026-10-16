# PhirSe clarity verifier

Background worker that scores how clearly each practice answer was said. It runs after sessions,
never in the live path, and never changes what the person heard during practice.

**Primary: Sarvam.** One extra Sarvam speech-to-text call per answer with the language left as
`unknown`. Clarity comes from `language_probability` and the detected language (clear Hindi comes
back as `hi-IN` with high confidence; mumbled speech often comes back as another language), whether
that transcript contains the word, and recording quality. No model download.

**Backup only: AI4Bharat IndicConformer** (600M, CTC head), loaded on first use and only when
Sarvam cannot settle an answer the live check left `uncertain`, when Sarvam disagrees with a live
`correct`, or when the Sarvam call fails. In tests on 75 stored answers it ran for 13.

Measured limits of `language_probability`: background noise barely lowers it, and short words
that are also English (कप/cup) come back as `en-IN`. Treat Sarvam clarity as coarse.

## What it measures

For each recorded answer it stores a `clarity` JSON on the `attempt` row:

| Field | Meaning |
| --- | --- |
| `clarity` | 0–100 word clarity: how clearly the target word came out (low when another word was said) |
| `speech_clarity` | 0–100 clarity of the speech itself, whatever word was said (Sarvam path) |
| `source` | `sarvam` or `indicconformer` (backup) |
| `language`, `language_probability` | What Sarvam detected and how sure it was |
| `word_match` | How strongly the audio supports the target word compared with the model's own best guess (CTC likelihood ratio per token, 0–1) |
| `articulation` | Mean confidence across the word's sounds after forced alignment |
| `sounds` | Backup only: each sound unit with its confidence and timing; `weakest` names the least clear one |
| `heard` | What the model heard without being told the word |
| `verdict` | `match`, `close`, `no_match` or `no_speech` (third scoring layer next to the two live Sarvam passes) |
| `quality` | Loudness, noise floor, signal-to-noise, clipping, onset delay, longest pause |
| `flags` | `too_quiet`, `noisy`, `clipped`, `too_short`, `no_speech`, `other_speaker` |

Clarity is not a clinical measure. Thresholds (`score.py`) are starting values to tune on labelled answers.

### Optional speaker check

With `SID_ENABLED=true` (needs `pip install speechbrain`, downloads a ~80 MB public model) the worker
builds a voice print per profile from answers that were very likely the person's own, and flags
answers that sound like someone else (for example a family member answering for them).

## Setup

```bash
pip install -r verifier/requirements.txt
```

Set `VERIFIER_BACKUP=none` to never load the backup model. Otherwise the model is gated on Hugging Face: accept its terms at
https://huggingface.co/ai4bharat/indic-conformer-600m-multilingual and set `HF_TOKEN` in the app's
`.env` (or log in with `huggingface-cli login`). Only the encoder and CTC head are downloaded
and loaded (about 2.4 GB); the RNNT heads are skipped.

## Run

From `verifier/`:

```bash
python -m phirse_verifier.worker            # poll for pending answers forever
python -m phirse_verifier.worker --once     # one batch
python -m phirse_verifier.worker --file answer.wav --target कप   # score one local file
python -m pytest                            # unit tests (no model needed)
```

The worker reads `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and `HF_TOKEN` from the app's `.env`.
