# PhirSe — Website MVP Plan (Hindi only)

Date: 16 Oct 2026 · Deadline: 31 Oct 2026 (Bolna Symphony Buildathon) · 15 build days

## Revision, 16 Oct: self-serve, therapist optional

The original plan below put a speech-language pathologist (SLP) in charge of every patient. That made PhirSe depend on the scarcest resource it is meant to work around. PhirSe is now a **self-serve home practice tool**; a therapist is an optional add-on.

| Area | Before | Now |
| --- | --- | --- |
| Who sets it up | SLP creates the patient after consent | Anyone: a family member presses "Start free practice" at `/start` (about one minute, no account) |
| Access | SLP magic-link login; patient token link | One private link per practice profile: `/p/<token>` to practise, `/p/<token>/dashboard` for progress and words. The device remembers it. |
| Words | SLP chooses and approves every word | 24 everyday starter words ready on day one (`lib/words/starter.json`); the family adds personal words in the dashboard, live immediately |
| Review | SLP labels attempts | Anyone with the link can listen back and optionally mark answers ("right word" / "not the word"); labels still feed agreement metrics |
| Safety | Alert to family + SLP; SLP resumes practice | Practice stops, safety screen shows 112, 108 and the family's number; dashboard shows the alert until the family confirms everyone is OK |
| Therapist | Required | Optional: share the dashboard link |
| Claims | "SLP-prescribed home practice" | "A practice tool, not a treatment"; no medical claims (keeps PhirSe on the wellness side of the CDSCO line, see research doc 04) |
| TTS cost | Rendered per patient | One shared, content-addressed clip cache in Supabase; a new profile costs about 3 TTS calls (its greeting) |

**Removed:** `/slp/*` dashboard, SLP sign-in and magic links, auth middleware, demo SLP login.

**Still true from the plan below:** session design, cue ladder, patience-first turn-taking, two-pass honest scoring, safety keywords, spaced repetition, metrics, judge mode, background verifier, timeline shape.

**Remaining work after this revision:** real-mic test in Chrome; Bolna rules check; deploy (Vercel `bom1`); judge mode on the landing page; background verifier; family-labelled validation set (replaces the SLP-labelled set: recruit 2–3 families or role-play); demo script and video. Sections below that mention SLP approval, SLP login or SLP review describe the old design.

## 0. What we are building, in one paragraph

PhirSe is SLP-prescribed **word-finding (anomia) practice for stroke survivors with aphasia, in Hindi**. The research pack designed it as a daily phone call. This plan delivers the same therapy as a **voice-first website**: the patient (with a family member nearby) opens a link on a phone or laptop, presses one big button, and a warm, slow Hindi voice (TTS) runs a 10–15 minute session: warm-up, 10–15 naming items with a cueing ladder, an occasional probe, and a close. The browser records each attempt, STT transcribes it, **our server** scores it against the known target word and decides the next step. A speech-language pathologist (SLP) sets up the patient, approves every word and prompt, reviews attempts in a dashboard, and sees progress. Family gets a short daily Hindi summary. Safety exits (BE-FAST signs, distress, fatigue) stop the session and alert humans.

**The pitch in one line:** *"Every voice agent optimises for speed; ours optimises for patience — and it is honest about what it heard."*

**What the website changes vs the phone design**

| Area | Phone design (research) | Website MVP |
| --- | --- | --- |
| Audio quality | 8 kHz narrow-band | 16 kHz wideband from the browser mic — easier STT |
| Visuals | None (phone only) | Optional picture per word, including the family's own photos (picture naming becomes possible), calm praise animations, visible "Help" button |
| Turn-taking | Bolna endpointing settings | Our own client-side VAD + per-patient patience timer — full control |
| Scheduling | Outbound call at fixed time | Reminder (WhatsApp/SMS, manual for pilot) + home-screen shortcut (PWA) |
| Telephony risk (CIN/GST number) | Big risk | Gone |
| Access barrier | Any phone | Needs a smartphone/laptop + a family member to open it the first time |
| Judges can try it | Need a phone number | Open a URL, try it in 2 minutes (judge mode, section 10) |

The **therapy engine is channel-agnostic**: the same server endpoints can later serve a Bolna phone agent as custom tools (`get_next_item`, `score_attempt`, `safety_exit`, `end_session`). See section 14.

## 1. Scope

| In the MVP | Not in the MVP |
| --- | --- |
| Post-stroke aphasia, word-finding only | Dysarthria, apraxia, comprehension drills, reading/writing |
| **Hindi only**; answers accepted in Devanagari, Romanised Hindi, and SLP-approved English equivalents (code-mix) | Other Indian languages (data model keeps a `language` field so they plug in later) |
| Tasks: automatic-speech warm-up, responsive naming, sentence completion, repetition, optional picture naming | MIT, script training, SFA/PCA, free conversation |
| 20 treated + 20 untreated words per patient, chosen by the SLP (personal words), plus an SLP-approved reserve list | LLM-chosen word lists without SLP approval |
| Deterministic server-owned state machine; all prompts pre-approved and pre-rendered to audio | LLM improvising during the session |
| Live scoring: two-pass Sarvam STT (unbiased + target-biased) + normalisation + exact match; "uncertain" instead of guessing; never says "wrong" | Live acoustic verification in the request path |
| Spaced repetition of treated words across sessions; SLP-set graduation rule | Automatic changes to the therapy plan without SLP sign-off |
| Background acoustic verification (IndicConformer), never blocking the UI | — |
| SLP relabels attempts; agreement metrics per scoring layer | Fully automatic scoring with no human check |
| SLP dashboard, patient session app, family summary page, judge mode | Billing, EHR, multi-clinic orgs, native mobile apps |
| Safety exits + alerts (email + dashboard; WhatsApp manual) | Diagnosis, severity ratings, medical advice |

## 2. Users and what each one sees

| Role | Access | Main screens |
| --- | --- | --- |
| **Patient** (+ family helper) | Opaque, revocable link created by the SLP (no password). Can be "Added to Home Screen". | Home (one big "शुरू करें" button), Mic check, Session, Done, Safety screen |
| **SLP** (RCI-registered) | Email magic-link login | Patient list, Patient setup + consent record, Word list editor, Session review (play + relabel + scoring trace), Progress, Alerts, Weekly report |
| **Family member** | Same patient link, "Family" tab | Today's summary in Hindi, streak, "today's best word" clip (consent-gated), how to stop + delete data, emergency info (112/108) |
| **Judges / public** | Open | Landing page, **judge mode** (try a 3-item session, then see the SLP view of your own attempts), public evidence page (anonymised agreement metrics) |

## 3. Tech stack

| Layer | Choice | Why |
| --- | --- | --- |
| Web app | **Next.js 15 (App Router) + TypeScript + Tailwind** | One codebase for pages + API routes; fast to ship |
| Hosting | **Vercel, region `bom1` (Mumbai)** | India region; zero-ops |
| DB + auth + file storage | **Supabase, region `ap-south-1` (Mumbai)**: Postgres, Auth (magic link), Storage (audio), Row-Level Security, `pg_cron` | DPDP-friendly India hosting; RLS isolates each SLP's patients; cron for background jobs |
| STT, pass A (unbiased) | **Sarvam `saaras:v3`, `mode=verbatim`**, `language_code=hi-IN`, no keyterms | Honest pass: least "helpful correction" |
| STT, pass B (biased) | **Sarvam `saaras:v4`** with `keyterms=[target, synonyms…]` (max 50 terms, 64 chars each) | Only v4 supports keyterms. The A-vs-B comparison stands in for the confidence score Sarvam does not provide |
| STT fallback | Google Cloud STT `hi-IN` | Sarvam outage |
| TTS | **Sarvam Bulbul v3** (`hi-IN`, slow `pace` ≈ 0.8, warm speaker chosen with SLP) | Natural Hindi + code-mix; pronunciation dictionary for personal names |
| Voice activity detection | **`@ricky0123/vad-web`** (Silero VAD in the browser, ONNX) | Speech start/end + a 16 kHz Float32 clip; free, no API |
| Acoustic verifier (background) | **AI4Bharat IndicConformer 600M** (MIT, CTC) in a Python FastAPI service on a **Hugging Face Space (free CPU)**; Modal GPU kept warm only during judging week if needed | Real confidence: per-frame CTC posteriors, target likelihood, NUVA-style DTW |
| LLM (offline only) | **Claude (`claude-sonnet-5-5`)** via Anthropic API | Draft prompts/cues for SLP approval, family summaries, error-type labels, weekly SLP note. Never in the live loop |
| Charts | Recharts | Progress graphs, confusion matrices |
| Alerts | Resend (email) + dashboard; WhatsApp click-to-send link (manual) | Simple and reliable for a pilot |
| Tests | Vitest (unit), Playwright with Chrome fake-audio flags (e2e) | Deterministic tests of the session loop |

### 3.1 What Sarvam STT does and does not give (checked against docs, 16 Oct 2026)

| Gives | Does not give |
| --- | --- |
| `transcript` | Transcript-level or word-level **confidence** |
| `timestamps` (chunk/phrase level only, with `with_timestamps=true`) | Word-level timestamps; log-probabilities |
| `language_probability` (language detection only, not accuracy) | Any "did they say the target?" verification |
| `keyterms` biasing (`saaras:v4` only; does not guarantee the term appears) | `mode` on v4 — docs say `mode` applies to `saaras:v3` only (**verify on day 2**) |
| Formats: WAV, MP3, AAC, OGG, FLAC…; raw PCM only at 16 kHz with `input_audio_codec` | Diarization on REST |

**Consequence:** Sarvam transcripts are a strong signal but **not a score on their own**. Strong STT language models pull near-misses toward real words ("कब" → "कप"), so a transcript can turn a phonemic error into a false "correct". We score with layers (section 6), and the SLP's labels are the ground truth.

**Why Sarvam live and IndicConformer offline (not the other way round):** Sarvam is managed, always warm, tuned for code-mix and noisy audio, and has built-in biasing. IndicConformer needs a server we run (cold starts of 5–30 s on serverless GPU would break a patient's turn), writes everything in Devanagari, but exposes CTC posteriors — a real confidence number Sarvam lacks. Day-2 spike compares both on the same 40-word set; STT is swappable behind `lib/speech/`, so the choice is cheap to revisit.

**Confirm on day 1–2:** model behaviour of `mode` on v4, Bulbul speakers and `pace` range, rate limits, pricing, buildathon credits, Sarvam data retention and region.

## 4. Architecture

```
 Patient browser (phone/laptop)                          Server (Next.js API on Vercel bom1)
 ┌───────────────────────────────┐                       ┌───────────────────────────────────────┐
 │ Session UI (big button, pic)  │  POST /session/start  │ Session state machine (DB-backed)     │
 │ Audio player (cached TTS mp3) │ ────────────────────► │  - item order, cue level, misses      │
 │ Silero VAD + patience timer   │  POST /attempt (wav)  │  - time budget, probe mode            │
 │ WAV encoder (16 kHz mono)     │ ────────────────────► │ Scorer: STT A ∥ STT B → normalise →   │
 │ Help button → safety screen   │ ◄──────────────────── │         match → decision + reason     │
 └───────────────────────────────┘   next action +       │ Safety keyword filter · Event log     │
                                      audio URL          └──────┬───────────────┬────────────────┘
                                                                │               │ attempt saved,
                     Sarvam STT  saaras:v3 verbatim  (pass A) ◄─┤               │ verifier_status=pending
                     Sarvam STT  saaras:v4 keyterms  (pass B) ◄─┘               ▼
                     Sarvam TTS  Bulbul v3 ◄── pre-render on SLP approval   Supabase (Mumbai)
                                                                            Postgres · Storage · Auth · pg_cron
                                                                                │
                                         pg_cron every minute → /api/jobs/verify│
                                                                                ▼
                                          IndicConformer verifier (HF Space, FastAPI)  ── writes verifier_score
                                          (if asleep/down: stays "pending", nothing breaks)

 SLP dashboard ─┐
 Family page   ─┼── read Supabase via server routes        Claude (offline): drafts, summaries, error labels
 Judge mode    ─┘                                          Resend: safety alert emails
```

**Key principles**

1. The server owns the therapy state machine. The browser only plays audio, listens, uploads.
2. The LLM only writes text that a human approves before patients hear it.
3. **Nothing slow or optional sits in the live request path.** The live loop depends only on Sarvam + our server + Supabase. The verifier is a background job; if it is down, the product still works and shows "Pending".

**Latency budget per turn (target p50 ≤ 2.5 s from end of speech to next audio):** VAD end-of-speech hangover 1.2–2.0 s (per patient) → upload ~50 KB WAV 0.2 s → Sarvam pass A and pass B **in parallel** 0.5–1.2 s → score + DB write < 0.1 s → play prefetched audio ~0 s. Optimisation: if pass A already gives an exact match, return immediately and let pass B finish in the background for logging.

## 5. The session, step by step

### 5.1 Session plan (≈12 min, 10–15 items)

| Block | What happens | Example audio (SLP approves real wording) |
| --- | --- | --- |
| Greeting + AI disclosure | Name, AI disclosure, start | "नमस्ते शर्मा जी! मैं PhirSe की AI साथी हूँ। आपकी थेरेपिस्ट ने आज की प्रैक्टिस भेजी है। शुरू करें?" |
| Safety check | One yes/no question; two big buttons (हाँ / नहीं) + voice | "आज तबीयत ठीक है? कोई नई परेशानी?" → any new symptom → safety exit |
| Warm-up | Automatic speech: count 1–10, days of week; doubles as a daily voice check (latency, volume) | "चलिए एक से दस तक साथ में गिनते हैं…" |
| Probe (2–3×/week, before practice) | 5 treated + 5 untreated, no cues, neutral "शुक्रिया" after each | "अब बिना हिंट के कुछ शब्द…" |
| Naming practice | 10–15 items, each with the cue ladder (5.2) | Prompt: "सुबह हम चाय किसमें पीते हैं?" |
| Close | Specific praise, next session, easy stop | "आज आपने 9 शब्द खुद बोले। कल फिर मिलते हैं।" |

### 5.2 Cue ladder per item (SLP chooses increasing or decreasing mode per patient)

Increasing mode (default):

1. **Prompt** — description or sentence frame (+ picture if picture mode is on)
2. **Semantic cue** — "यह रसोई में होता है, हाथ से पकड़ते हैं।"
3. **Phonemic cue** — first sound/syllable: "क…" (SLP's own recorded voice recommended; TTS often mispronounces isolated syllables)
4. **Model** — "कप। अब आप बोलिए: कप।" (repetition)
5. **Move on warmly** — "बहुत अच्छा कोशिश! अगला शब्द…"

Decreasing mode: start at Model (repeat), then Phonemic, then Prompt only on the next exposure.

### 5.3 Turn-taking (browser)

Per-patient settings (SLP-set, defaults in brackets):

- `patience_ms` — wait after prompt audio ends before giving next cue if no speech starts [8000]
- `end_of_speech_ms` — silence inside an attempt before we treat it as finished [1500; raise for patients who pause mid-word]
- `max_attempt_ms` — hard cap on one attempt [10000]
- `tts_pace` — [0.8]

**Auto-suggested patience:** after 3 sessions, the dashboard suggests a patience window from the patient's own latency distribution (e.g. 90th percentile of successful-attempt latency + 2 s). The SLP accepts or ignores it; nothing changes automatically.

Rules:

- Mic stays open during agent audio with `echoCancellation: true`; **if VAD detects patient speech while the agent is talking, stop the agent audio at once** (barge-in). A half-duplex setting exists for devices with bad echo.
- Silence past `patience_ms` = "stuck" → next cue. Never "Hello?", never auto-end.
- Visual "listening" indicator is calm (soft pulsing circle), no countdown timer.
- Patient can always tap "अगला" (skip) or "रुकिए" (pause).
- Latency (prompt end → speech start) is logged for each attempt.

### 5.4 Server state machine

States: `GREETING → SAFETY_CHECK → WARMUP → [PROBE(j)] → ITEM(i, cue_level) → CLOSE → DONE`, plus `SAFETY_EXIT` and `PAUSED` reachable from anywhere.

Events from the client: `start`, `attempt(audio)`, `silence_timeout`, `skip`, `pause`, `resume`, `help_pressed`, `yes`/`no` (button answers).

Transitions inside `ITEM`:

| Score result | Next action |
| --- | --- |
| `correct` | Praise (varied, from a pre-rendered pool) → next item; log cue level reached |
| `not_yet` or `uncertain` | Next cue level; uncertain attempts are flagged for SLP review |
| Cue ladder exhausted | Model step → patient repeats → praise effort → next item |
| "पता नहीं" / "नहीं आता" / "छोड़ो" detected | Next cue immediately (no wait) |
| 3 items in a row not reached before model step | Easier item or a warm-up line, praise, then shorten the session |
| Safety keyword or Help button | `SAFETY_EXIT` |
| Time budget reached | Finish current item → `CLOSE` |

State lives in Postgres (`session.state` JSONB) so API routes stay stateless; every transition writes an `event` row (audit trail for the SLP).

### 5.5 Word scheduling across sessions (spaced repetition)

Within the SLP's approved list, the server picks which treated words to practise today:

- **Leitner boxes 1–4** per treated word. Correct with no cue → move up a box; needed a cue → stay; model step → back to box 1. Box 1 every session, box 2 every 2nd, box 3 every 4th, box 4 only in probes.
- **Graduation rule (SLP-set, default):** correct with no cue in 3 consecutive sessions → "graduated"; the dashboard proposes the next word from the SLP's reserve list. The SLP clicks to swap. No automatic plan changes.
- Inside a session: interleave words, never the same word twice in a row, one spaced re-exposure of a word failed earlier.
- Untreated words are **never** practised; they appear only in probes (keeps the generalisation measure clean).

## 6. Scoring (the hard part)

Every decision is stored with a **reason** so the SLP (and judges) can see exactly why the system scored what it did — the "scoring trace".

### 6.1 Live pass (in the request, Sarvam only)

1. Browser sends 16 kHz mono WAV of one attempt.
2. Server calls, **in parallel**:
   - **Pass A** — `saaras:v3`, `mode=verbatim`, no keyterms → `transcript_a`
   - **Pass B** — `saaras:v4`, `keyterms=[target, accepted forms]` → `transcript_b`
3. **Normalise** both: Unicode NFC; strip punctuation; nukta folding (क़→क, ज़→ज, फ़→फ); chandrabindu/anusvara folding (ँ→ं); collapse repeated characters; transliterate Devanagari ↔ Roman with `@indic-transliteration/sanscript` and lowercase; tokenise.
4. **Match** tokens (and adjacent pairs for two-word targets) against the item's `accepted_forms` (Devanagari target, Roman spellings, SLP-approved synonyms and English equivalents like "कप"/"cup"/"प्याला"):

| Pass A (unbiased) | Pass B (biased) | Decision | Reason code |
| --- | --- | --- | --- |
| Exact match | (any) | `correct` | `A_EXACT` |
| Close match (edit-distance ratio ≥ 0.75, not exact) | Exact match | `uncertain` | `A_CLOSE_B_EXACT` |
| No match | Exact match | `uncertain` | `B_ONLY` (target heard only when pushed) |
| Close match | No/close match | `uncertain` | `A_CLOSE` (likely phonemic error) |
| No match | No match | `not_yet` | `NO_MATCH` |
| Target after a wrong word in A ("बिस्तर… नहीं, कप") | — | `correct`, `self_corrected=true` | `A_SELF_CORRECT` |
| Empty transcript, VAD heard speech | — | `uncertain` | `EMPTY_STT` |

   Close matches are **never** auto-accepted: that is where phonemic errors live, and accepting them would inflate progress.
5. Safety keyword scan on both transcripts (6.4).
6. Store audio in Supabase Storage + attempt row with `verifier_status = 'pending'`.

**Live wording rule:** the patient never hears "गलत". `uncertain` and `not_yet` both lead to the next cue with encouragement.

### 6.2 Background acoustic verifier (IndicConformer, never blocks the UI)

- **Job flow:** `pg_cron` calls `/api/jobs/verify` every minute → picks up to N `pending` attempts → POSTs audio URL + target + reference audio URLs to the verifier → writes `verifier_score`, `verifier_status = done`. Failures retry 3 times with backoff, then `failed`. If the Space is asleep, attempts simply wait as `pending`.
- **What the verifier computes:**
  1. **Target likelihood** — CTC forced alignment of the target's character sequence against the attempt; normalised log-likelihood vs the best free decode (a real confidence number).
  2. **NUVA-style template match** — phone/character posteriorgrams of the attempt vs 2–3 reference recordings of the target (healthy speakers; Bulbul TTS as fallback), DTW distance.
  3. Free transcript from IndicConformer as a third opinion.
- **Use:** shown in the SLP review next to the live score; included in agreement metrics as "layer 3". Thresholds tuned on SLP labels. It never changes what the patient heard.
- **Hosting:** Hugging Face Space, free CPU (2 vCPU, 16 GB). 1–2 s clips on CPU should take seconds — fine for a background job. Free Spaces sleep after ~48 h idle → GitHub Actions cron pings it every few hours during judging week. Upgrade to a warm Modal GPU only if CPU is too slow.
- **Shared secret** between Vercel and the Space; the Space receives short-lived signed audio URLs, never stores audio.

### 6.3 SLP labels and agreement

- SLP reviews flagged (`uncertain`) and a random 20% of other attempts: play audio, see the scoring trace (A, B, verifier, reason code), one-click label `correct / incorrect` (+ optional error type: semantic, phonemic, no response, unrelated, other). These labels are the validation set.
- Claude drafts an error-type label from transcripts + target, marked "automatic, for SLP review"; it never changes the score.
- Agreement report per layer — **(1) pass A only, (2) A + B, (3) A + B + verifier** — with accuracy, sensitivity on correct answers, specificity on errors, false-accept rate, Cohen's kappa, % uncertain, and a confusion matrix. This is the headline technical result: it shows what each layer of speech work added.

### 6.4 Safety keywords (SLP must approve the final list)

Hindi + Romanised + English variants for: new weakness/numbness (हाथ/पैर काम नहीं कर रहा, सुन्न), face drooping (मुँह टेढ़ा), vision (दिखाई नहीं दे रहा, धुंधला), balance/dizziness (चक्कर, गिर गया), severe headache (बहुत तेज़ सिर दर्द), chest pain, choking/coughing (खाँसी, अटक गया), distress/hopelessness (मरना है, जीना नहीं, बेकार हूँ, रोना), stop requests (बस, बंद करो, अब नहीं). Matching is deliberately broad: false positives end a session gently; false negatives are unacceptable. Scan **both** transcripts (biasing toward the target can hide other words).

## 7. Safety design

| Trigger | What the app does |
| --- | --- |
| Help button (always visible), safety-check "yes", or BE-FAST keyword | Stop audio. Full-screen safety page in large Hindi text + audio: "अभी 112 या 108 पर कॉल करें। लक्षण शुरू होने का समय नोट करें।" with tap-to-call 112/108 buttons. Alert email to family + SLP; red alert on dashboard; WhatsApp pre-filled message button for the family helper. Session locked until SLP clears it. |
| Distress / hopelessness words | Warm closing line, end session, alert family + SLP; family page shows Tele-MANAS helpline (**verify number before launch**). Never counsel. |
| Sudden drop vs own baseline | After session: if accuracy on items the patient reliably got (≥ 80% over last 3 sessions) drops by ≥ 40 points, or warm-up latency jumps sharply, flag a "same-day check" alert to family + SLP with a BE-FAST checklist. Thresholds tuned with SLP. |
| Repeated failure / fatigue | 3 misses in a row → easier content; latency rising late in session → offer to stop; hard cap at SLP session length (start 10–15 min). |
| Coughing/choking reported | Pause; ask family to check; resume only after a family tap on "सब ठीक है". |

Every page states: **PhirSe is not an emergency service.** Safety is tested with a scripted e2e case for every trigger before any real patient session.

## 8. Data model (Postgres)

```
slp(id, auth_user_id, name, rci_crr_number, phone, email, created_at)

patient(id, slp_id, display_name, honorific, language='hi', is_demo bool,
        access_token_hash, token_revoked_at,
        settings jsonb {patience_ms, end_of_speech_ms, max_attempt_ms, tts_pace,
                        tts_speaker, cue_mode: 'increasing'|'decreasing',
                        session_minutes, picture_mode, probe_days[],
                        graduation_rule {consecutive_sessions: 3}},
        family_name, family_phone, family_email, status: active|paused|withdrawn,
        created_at)

consent(id, patient_id, calls bool, recording bool, slp_access bool,
        anonymised_metrics bool, demo_use bool, family_clip_share bool,
        signed_at, witness_slp_id, document_path, withdrawn_at)

word_item(id, patient_id, target_deva, set: 'treated'|'untreated'|'warmup'|'reserve',
          accepted_forms text[], prompt_text, frame_text, semantic_cue_text,
          phonemic_cue_text, model_text, image_path, difficulty int,
          leitner_box int default 1, graduated_at,
          approved_at, approved_by, source: 'slp'|'llm_draft')

audio_asset(id, owner_type, owner_id, kind: prompt|semantic|phonemic|model|praise|system|reference,
            text, speaker, pace, storage_path, source: 'tts'|'slp_recording'|'healthy_speaker',
            created_at)

session(id, patient_id, kind: practice|probe|practice+probe|judge_demo, state jsonb,
        started_at, ended_at, end_reason: completed|time|patient_stop|safety|abandoned,
        minutes_active)

attempt(id, session_id, word_item_id, phase: warmup|practice|probe,
        cue_level int, audio_path, duration_ms, latency_ms,
        transcript_a, transcript_b, normalised_a, normalised_b,
        live_score: correct|not_yet|uncertain, reason_code, self_corrected bool,
        stt_ms_a, stt_ms_b,
        verifier_status: pending|done|failed|skipped, verifier_score float,
        verifier_target_ll float, verifier_dtw float, verifier_transcript,
        verifier_attempts int, verified_at,
        slp_label, slp_error_type, llm_error_type, created_at)

event(id, session_id, ts, type, payload jsonb)          -- full audit trail
alert(id, patient_id, session_id, kind: befast|distress|baseline_drop|choking|help_button,
      details jsonb, created_at, notified_at, acknowledged_by, acknowledged_at)
```

RLS: an SLP sees only their patients; patient-link requests go through server routes that check the token hash (no direct DB access from the patient app). Storage buckets private; audio served via short-lived signed URLs. Judge-mode sessions are attached to the demo patient, auto-deleted after 24 h.

## 9. API routes

| Route | Who | Does |
| --- | --- | --- |
| `POST /api/p/session/start` | Patient token | Create session, decide practice/probe, pick today's words (5.5), return first action + prefetch list of audio URLs |
| `POST /api/p/session/:id/attempt` | Patient token | multipart WAV + `{item_id, cue_level, latency_ms}` → STT A ∥ B → score → safety scan → next action |
| `POST /api/p/session/:id/event` | Patient token | `silence_timeout`, `skip`, `pause`, `resume`, `yes`, `no`, `help_pressed` → next action |
| `POST /api/p/session/:id/end` | Patient token | Close session, update Leitner boxes, compute summary, queue family summary |
| `GET  /api/p/summary` | Patient/family token | Today's summary, streak, best-word clip (if consented) |
| `POST /api/p/withdraw` | Family token | Stop + request deletion (SLP and builder notified) |
| `POST /api/judge/start` | Public (rate-limited) | Create a 3-item judge session on the demo patient; return a token |
| `GET  /api/judge/:token/review` | Judge token | The SLP review view of that judge's own attempts (live score now, verifier when ready) |
| `POST/PATCH /api/slp/patients` | SLP | Create/update patient, settings, consent, rotate link |
| `POST /api/slp/words/draft` | SLP | Claude drafts prompt, frame, cues, synonyms for a list of target words |
| `POST /api/slp/words/:id/approve` | SLP | Lock text, render TTS clips (Sarvam) to Storage |
| `POST /api/slp/audio/:id/record` | SLP | Upload SLP's own recording to override a TTS clip (e.g. phonemic cue) |
| `PATCH /api/slp/attempts/:id/label` | SLP | Relabel attempt |
| `GET  /api/slp/patients/:id/progress` | SLP | Aggregated metrics for charts |
| `GET  /api/slp/patients/:id/report` | SLP | Printable weekly report (HTML → print to PDF) |
| `POST /api/slp/alerts/:id/ack` | SLP | Acknowledge alert, unlock patient |
| `POST /api/jobs/verify` | `pg_cron` (secret) | Send pending attempts to the verifier, write results, retry/backoff |
| `GET  /api/public/evidence` | Public | Anonymised agreement metrics per layer (consented data only) |
| `GET  /api/admin/metrics/agreement` | Builder | Full agreement report |

**Next-action payload** (same shape a Bolna tool would return later):

```json
{
  "action": "play_and_listen",
  "state": "ITEM",
  "item_id": "…", "cue_level": 2,
  "audio_urls": ["https://…/semantic.mp3"],
  "text": "यह रसोई में होता है…",
  "image_url": null,
  "listen": {"patience_ms": 8000, "end_of_speech_ms": 1500, "max_attempt_ms": 10000},
  "progress": {"done": 4, "total": 12}
}
```

`action` is one of `play_and_listen`, `play_only`, `ask_yes_no`, `safety_exit`, `end`. `text` is shown as a large caption (toggle).

## 10. Pages and UX

### Patient app (`/p/[token]`) — designed for aphasia

- One action per screen. Huge Devanagari type (≥ 32 px, Noto Sans Devanagari or Mukta), high contrast, warm colours.
- Audio first; text captions optional (reading may also be affected).
- Main button bottom-centre, large enough for the non-dominant hand (many patients have right-side weakness).
- No red crosses, no scores during practice, no countdowns. Praise is specific and varied.
- **Personal pictures:** family uploads photos (grandchild, their own cup, local temple) through the SLP; picture mode shows them. Personal relevance is what worked in Big CACTUS.
- **"Words I've got back" garden:** each graduated word becomes a flower on the home screen — positive-only progress the patient can see, no failure shown.
- First run: family-assisted **mic check + calibration** (say 3 easy words; checks volume, noise, STT works) and the consent reminder.
- Persistent: "मदद" (Help, top corner), "रुकिए" (pause), "अगला" (skip).
- PWA manifest so the family can add it to the home screen; works on low-end Android Chrome; handles mic-permission denial with a picture guide; prefetches all of today's audio so a weak connection does not stall the session.
- Room noise warning if VAD sees constant speech (TV) before the session.

### SLP dashboard (`/slp`)

- **Patients**: name, adherence this week (sessions, minutes vs 50-min target), last session, open alerts, words graduated.
- **Patient setup**: profile, settings sliders (patience, pace, session length, cue mode, picture mode, probe days), auto-suggested patience, consent checklist with upload of signed form, rotate/revoke link.
- **Word editor**: paste target words + a line of life context → Claude drafts prompt/frame/cues/synonyms → SLP edits → preview audio (TTS) → approve; mark treated/untreated/reserve; optional picture; record own voice for any clip.
- **Session review**: timeline of items; per attempt play audio, **scoring trace** (pass A, pass B, verifier score/status, reason code), cue level, latency; one-click relabel; filter "uncertain only".
- **Progress**: treated vs untreated accuracy across probes; cue-level heatmap (word × day) showing words getting easier before they are independent; latency trend; minutes per week vs target; Leitner box distribution.
- **Weekly report**: one printable page per patient for the SLP's records.
- **Alerts**: list, details, acknowledge.

### Family page (`/p/[token]/family`)

- Today: "आज 12 मिनट अभ्यास किया, 9 शब्द खुद बोले।" + streak.
- **Today's best word**: a 2-second clip of the patient saying a word they found on their own (only with `family_clip_share` consent). Emotional proof for the family and for the pitch.
- Tips approved by the SLP (quiet room, sit nearby, don't answer for them).
- Emergency info (112/108), Tele-MANAS, how to stop and delete data.

### Public + judge mode

- **Landing page**: the story, the evidence (Big CACTUS, RELEASE), the honest claim ("more practice, in your language, with progress your SLP can see"), safety and consent statement.
- **Judge mode ("Try it in 2 minutes")**: judge runs a 3-item session as the demo patient (common words: चाय, पानी, कप) → clicks "See what the SLP sees" → their own attempts appear in the review screen with scoring trace; live score immediately, verifier score when ready (or "Pending"). Rate-limited; judge audio auto-deleted after 24 h; a one-line notice says audio is processed by Sarvam.
- **Pre-verified demo patient**: seeded with real SLP role-play sessions, already verified offline — so the dashboard, charts, verifier scores and agreement numbers always look complete, even if the verifier Space is asleep.
- **Evidence page**: anonymised agreement per scoring layer, confusion matrix, latency distribution — the technical proof in one screen.

## 11. LLM usage (offline only, Claude)

| Task | Input | Output | Guardrail |
| --- | --- | --- | --- |
| Draft item text | Target word, life context the SLP typed (e.g. "lives in Lucknow, loves cricket") | Prompt, sentence frame, semantic cue, phonemic cue, model line, accepted synonyms, in simple Hindi (≤ 8 words per sentence) | Status `llm_draft` until the SLP approves; patients never hear unapproved text |
| Family summary | Session stats | 2-line Hindi summary | Template-constrained; no clinical claims |
| Error type label | Target + transcripts | semantic / phonemic / none / unrelated + reason | Marked automatic; SLP view only |
| SLP weekly note | Week metrics | Short clinical-style summary | Marked draft |

Send only what is needed (no full names; use honorific placeholders). List Anthropic, Sarvam and Hugging Face in the consent vendor list.

## 12. Privacy, consent, compliance (from research doc 04)

- Positioning: *home-practice exercises prescribed and supervised by a registered SLP.* No diagnosis, no "treats aphasia" claim; automatic scores labelled "for SLP review".
- AI disclosure in the first sentence of every session; never clone a real person's voice (SLP's own recordings are their real voice, with their consent).
- Unbundled consent ticks: sessions, recording, SLP access, anonymised metrics, demo use, family clip share. Aphasia-friendly one-page form (EN/HI) from doc 04, SLP as witness.
- Data in India (Vercel `bom1`, Supabase `ap-south-1`). Vendors outside that boundary (Sarvam, Anthropic, Hugging Face Space region) listed in the notice; verifier receives short-lived signed URLs and stores nothing.
- Encryption at rest and TLS; signed URLs; audit log (`event` table).
- Withdraw = stop + delete: one button on the family page; deletion script removes Storage audio, attempts, sessions; tested before pilot.
- One-page breach plan written before the first real patient.
- Keep the pilot as clinical care plus product feedback; no "study" claims without an ethics committee.

## 13. What makes this impressive (and where each piece lives)

| Feature | Why judges care | Section | Priority |
| --- | --- | --- | --- |
| Patience-first turn-taking with per-patient windows + auto-suggestion | The core insight; unlike every other voice agent | 5.3 | Must |
| Two-pass honest scoring with reason codes ("scoring trace") | Shows we understand aphasic ASR failure modes; explainable | 6.1 | Must |
| Agreement vs SLP per layer + confusion matrix | Hard numbers, comparable to NUVA (89.5% English) | 6.3 | Must |
| Judge mode with "see what the SLP sees" | Judges experience the product and the tech in 2 minutes | 10 | Must |
| Safety exits with live e2e tests | Responsibility, non-negotiable in health | 7 | Must |
| Background IndicConformer verifier | Real acoustic confidence, Indian open-source stack | 6.2 | Should |
| Spaced repetition + SLP-gated graduation | Evidence-based dosing, still clinician-controlled | 5.5 | Should |
| Personal photos + word garden | Emotional, personal relevance (Big CACTUS) | 10 | Should |
| Today's best word clip for family | The demo moment that lands | 10 | Could |
| Evidence page, weekly report | Polish, credibility | 10 | Could |

## 14. Bolna / phone channel (keep the door open)

The buildathon is Bolna's. Two options, decide on day 1 after checking the rules:

1. **Website-only submission** (this plan), if allowed.
2. **Website + Bolna channel**: reuse the therapy engine. Bolna graph agent calls our routes as custom tools (`get_next_item` ≈ `/event`, `score_attempt` ≈ `/attempt` with transcript instead of audio, `safety_exit`, `end_session`). Bolna's web-call widget can also be embedded on the site for the demo if a phone number is unavailable. Budget days 12–13 for this only if required. Pitch angle: "same therapy brain, any channel — browser today, a basic phone call tomorrow."

Design implication now: keep `scoreAttempt(item, transcripts)`, the state machine and the word scheduler as pure functions in `lib/engine/`, independent of Next.js and of audio.

## 15. Project structure

```
phirse/
  app/
    (public)/page.tsx                 landing
    (public)/try/page.tsx             judge mode
    (public)/evidence/page.tsx        anonymised metrics
    p/[token]/page.tsx                patient home (word garden)
    p/[token]/session/page.tsx        session runner
    p/[token]/family/page.tsx         family summary
    slp/...                           dashboard pages
    api/p/... , api/slp/... , api/judge/... , api/jobs/... , api/public/... , api/admin/...
  lib/
    engine/stateMachine.ts            pure, unit-tested
    engine/scheduler.ts               Leitner + graduation, pure
    engine/scorer.ts                  two-pass decision table + reason codes, pure
    engine/hindiNormalise.ts
    engine/safety.ts                  keyword lists + scan
    speech/sarvamStt.ts               pass A / pass B, swappable interface
    speech/sarvamTts.ts
    verifier/client.ts                calls the HF Space
    llm/drafts.ts  llm/summaries.ts
    db/ (supabase client, queries)
  components/patient/ (BigButton, Listening, PictureCard, HelpButton, WordGarden)
  components/slp/     (WordEditor, AttemptRow, ScoringTrace, ProgressChart, CueHeatmap)
  hooks/useVoiceTurn.ts               VAD + patience timer + barge-in + WAV upload
  supabase/migrations/*.sql           schema + RLS + pg_cron job
  scripts/ renderTts.ts, agreementReport.ts, deletePatient.ts, seedDemo.ts, verifyOffline.py
  tests/ unit/, e2e/ (Playwright, fake audio fixtures)
  verifier/ (Python FastAPI + IndicConformer, Dockerfile for HF Space)
  .github/workflows/ping-verifier.yml
```

Env vars: `SARVAM_API_KEY`, `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `TOKEN_PEPPER`, `VERIFIER_URL`, `VERIFIER_SECRET`, `JOBS_SECRET`.

## 16. Testing

- **Unit (Vitest):** Hindi normaliser (nukta, anusvara, Roman variants, code-mix), scorer decision table (every row of 6.1), state machine transitions (every row of 5.4), scheduler (Leitner moves, graduation), safety scanner (Hindi + Roman + English lists), baseline-drop detector.
- **Speech spike set (day 2):** 40 Hindi words × 3 speakers recorded in the browser, plus deliberate errors (semantic, phonemic, partial, silence). Measure correct-detection and false-accept rate for: v3 verbatim, v3 codemix, v4 default, v4 + keyterms, IndicConformer. Also check whether `mode` has any effect on v4. Decide pass A / pass B config from data.
- **E2E (Playwright):** Chrome `--use-fake-device-for-media-stream --use-file-for-fake-audio-capture=fixture.wav`; full session with scripted correct, wrong, silent, close-error and safety-keyword attempts; judge-mode flow; verifier-down case (attempts stay `pending`, UI fine).
- **Device tests:** low-end Android Chrome, iPhone Safari (start audio only after a user tap), laptop Chrome; noisy room.
- **SLP role-play:** SLP simulates typical errors for a labelled starter set (marked simulated).

## 17. Success metrics (for 31 Oct)

| Metric | Target | Minimum |
| --- | --- | --- |
| Patients (SLP + consent) | 5–10 | 2–3, or SLP role-play |
| Session completion | ≥ 80% of planned | ≥ 60% |
| Practice minutes / patient / week | ≥ 50 | ≥ 30 |
| Agent vs SLP agreement (best layer) | ≥ 85% accuracy, kappa reported | Reported honestly |
| Lift from layers | Layer 2/3 beats pass A alone on false-accept rate | Reported either way |
| False-accept rate (agent "correct", SLP "incorrect") | ≤ 5% | Reported |
| Turn latency (speech end → next audio) | p50 ≤ 2.5 s | p90 ≤ 4 s |
| Treated-word accuracy, first vs latest probe | Upward trend, untreated shown alongside | Data shown either way |
| Safety | Zero missed escalations; every trigger covered by an e2e test | Same |
| SLP verdict | Written quote | Feedback |

## 18. Timeline (16–31 Oct)

| Day | Date | Work | Done when |
| --- | --- | --- | --- |
| 1 | Thu 16 | Check buildathon rules (website OK? Bolna required?). Sarvam + Anthropic keys. Contact SLP. Scaffold Next.js + Supabase (Mumbai). | Repo deploys to Vercel; SLP call booked |
| 2 | Fri 17 | **Speech spike**: browser VAD → WAV → Sarvam v3/v4 matrix + IndicConformer on Colab; Bulbul slow voice; record 40-word test set | Spike numbers; pass A/B config chosen |
| 3 | Sat 18 | Schema + RLS migrations; SLP auth; patient create + token link; consent record | SLP can create a patient and open the link |
| 4 | Sun 19 | Word editor; Claude draft endpoint; approve → TTS render to Storage; SLP voice override | 40 approved items with audio for a demo patient |
| 5 | Mon 20 | `lib/engine`: normaliser, two-pass scorer, state machine, scheduler, safety scanner + unit tests | All unit tests green |
| 6 | Tue 21 | `useVoiceTurn` hook: VAD, patience timer, barge-in, upload; session API routes | One full item loop works end to end |
| 7 | Wed 22 | Full session runner UI; prefetch audio; Help + safety screen; alert emails; safety e2e tests | Complete 12-min session on a phone |
| 8 | Thu 23 | SLP session review with scoring trace; relabel; alerts page; family summary page | SLP can review a session |
| 9 | Fri 24 | Verifier service on HF Space + `/api/jobs/verify` + `pg_cron` + ping workflow | Attempts move `pending → done`; verifier-down e2e passes |
| 10–11 | Sat 25 – Sun 26 | **SLP sessions / role-play** (and patients if consented); 100–200 labelled attempts; tune patience, end-of-speech, thresholds | Labelled set exists |
| 12 | Mon 27 | Agreement report per layer; evidence page; progress charts + cue heatmap; (Bolna channel if required) | Metrics per layer on screen |
| 13 | Tue 28 | Judge mode; `seedDemo` with pre-verified sessions; word garden; (Bolna channel if required); device + noise testing | Judge flow works on phone and laptop |
| 14 | Wed 29 | Demo script; record backup video; pitch slides with real numbers; landing page | Rehearsed demo |
| 15 | Thu 30 | Buffer, final polish, ping verifier, submission text | Submitted |
| — | Fri 31 | Deadline | — |

**Cut order if behind:** best-word clip → evidence page (keep numbers in slides) → word garden → weekly report → spaced repetition (fall back to fixed order) → background verifier (keep offline Colab numbers in slides) → picture mode → SLP voice override. **Never cut:** safety exits, SLP approval of content, consent, "never says wrong", two-pass scoring with reason codes, judge mode, pre-verified demo patient.

## 19. Demo script (under 5 minutes)

1. **The person (30 s).** A stroke survivor who knows the word "चाय" but cannot say it. ~2 million Indians live with aphasia; ~6,000 audiologists and speech therapists serve the whole country.
2. **The gap (30 s).** Recovery needs 20–50 hours of practice; usual care gives a fraction, and every good app needs an iPad, English and working hands.
3. **Live session (60 s).** On a phone: three items. The agent waits patiently through a long pause, gives a semantic then phonemic cue, praises the success. Backup video ready.
4. **The hard part (60 s).** Open the SLP view of those exact attempts: pass A vs pass B, reason code, verifier score. "Open transcription lies about aphasic speech — here is a near-miss STT turned into the right word, and here is how we caught it."
5. **Proof (60 s).** Agreement per layer vs the SLP, minutes practised, treated vs untreated probe trend, cue heatmap, the SLP's quote, a family's "best word" clip (with consent).
6. **Why now, why us (30 s).** iTalkBetter proved the method in English; Sarvam, AI4Bharat and Bolna make a Hindi version possible now.
7. **What's next (30 s).** Same engine on a basic phone call via Bolna, more languages, dysarthria and script training, the CDSCO pathway. Invite judges: "try it yourself at /try."

## 20. Risks

| Risk | Signal | Mitigation |
| --- | --- | --- |
| Buildathon requires Bolna/phone | Rules page on day 1 | Engine is channel-agnostic; days 12–13 reserved for Bolna tools + web-call widget |
| Sarvam misses short single-word Hindi answers | < 80% detection on spike set | Pick best v3/v4 config from spike; accept SLP synonyms; uncertain → cue, not "wrong"; fallback STT |
| STT "corrects" phonemic errors into the target | False accepts in spike set | Verbatim pass A; close match = uncertain; A-vs-B check; verifier; SLP review |
| `mode` not honoured on v4 / keyterms not on v3 | Spike results | Two-model setup (A on v3, B on v4) already assumes this |
| Two STT calls double cost and add latency | p50 > 2.5 s | Run in parallel; return early on `A_EXACT`; skip pass B when A is exact |
| Verifier Space asleep or slow during judging | `pending` piling up | Background job only; pre-verified demo data; ping workflow; Modal GPU fallback |
| Judges' audio and privacy | — | Notice on judge page; rate limit; auto-delete after 24 h |
| Mic/echo problems on phones | Agent hears itself, false barge-ins | `echoCancellation`, VAD tuning, headset tip, half-duplex setting |
| iOS Safari autoplay/mic quirks | Audio won't play | Start every session from a tap; unlock AudioContext on first tap |
| No SLP in time | No call by 20 Oct | Clinically reviewed prototype + SLP role-play; pilot pitched as starting November |
| No patients in time | None by 22 Oct | Role-play labelled set, clearly marked simulated |
| Patient can't use a website alone | Family feedback | Family-assisted first run; PWA shortcut; phone channel (Bolna) as roadmap |
| Scope creep | Features not in section 1 | Re-read scope daily; follow cut order |
| Overclaiming | Any slide says "restores speech" | Use the honest claim only |

## 21. Open questions

**Buildathon / Bolna**
- [ ] Is a website-only submission accepted, or must Bolna be used?
- [ ] Sarvam credits via the buildathon?

**Sarvam (confirm on day 1–2)**
- [ ] Does `mode=verbatim` have any effect on `saaras:v4`? Does `keyterms` work on v3? (Docs: modes v3 only, keyterms v4 only.)
- [ ] Rate limits for two parallel calls per attempt; pricing per minute.
- [ ] Bulbul v3 Hindi speakers, `pace` range, pronunciation dictionary for personal names.
- [ ] Data retention and region for API audio.

**Verifier**
- [ ] IndicConformer CPU latency for a 2 s clip on a free HF Space (target < 10 s).
- [ ] Reference audio: who records the 2–3 healthy-speaker versions of each target (team, friends, SLP)?

**SLP**
- [ ] Which patients fit; increasing or decreasing cues each; what counts as correct (synonym, English word, close sounds).
- [ ] Starting patience window, end-of-speech silence, session length per patient; graduation rule.
- [ ] Final safety keyword list and escalation steps; Tele-MANAS number check.
- [ ] Picture mode wanted? Family photos vs a pictogram set (check licence).
- [ ] One hour to label recordings next week.

**Us**
- [ ] Name check ("PhirSe").
- [ ] Solo or add a frontend teammate.
