# PhirSe (फिर से — "again")

Voice-first Hindi word-finding practice for stroke survivors with aphasia, prescribed and supervised by a speech-language pathologist (SLP).

> PhirSe adds structured, SLP-prescribed home practice in the patient's language, at a dose usual care rarely reaches. It does not replace a speech therapist, does not diagnose, and is not an emergency service.

## The problem

- About 2 million people in India live with aphasia after stroke. About 6,000 registered audiologists and speech therapists serve the whole country.
- Recovery evidence points to 20–50 hours of practice (RELEASE, *Stroke* 2022). Usual care delivers a fraction of that.
- Good aphasia apps exist, but they need a tablet, English, literacy and working hands.

## What PhirSe does

1. The SLP picks 20 personal words for the patient (family names, foods, places) and approves every prompt and cue.
2. The patient opens a link on a phone and presses one big button. A slow, warm Hindi voice runs a 10–15 minute session: warm-up, naming practice with a cueing ladder (description, meaning hint, first sound, model), and a short close.
3. The app waits patiently through long word-finding pauses. It never says "wrong".
4. Each attempt is scored against the known target word with two speech-to-text passes, and checked again in the background by an acoustic verifier. Unsure answers are flagged for the SLP, never guessed.
5. The SLP reviews attempts, relabels them, and sees progress on practised versus unpractised words. The family gets a short daily summary in Hindi.
6. Safety: a Help button, stroke warning-sign (BE-FAST) and distress keywords stop the session and alert family and SLP.

## Status

Under active development for the Bolna Symphony Buildathon (Oct 2026). See [PLAN.md](PLAN.md) for the full MVP plan and [research/](research/) for the clinical, technical and regulatory research.

## Tech stack

| Layer | Choice |
| --- | --- |
| Web app | Next.js (App Router), TypeScript, Tailwind CSS |
| Data, auth, storage | Supabase (Mumbai region) |
| Speech-to-text | Sarvam Saaras (`saaras:v3` verbatim + `saaras:v4` with keyterms) |
| Text-to-speech | Sarvam Bulbul v3 (Hindi, slow pace) |
| Voice activity detection | Silero VAD in the browser (`@ricky0123/vad-web`) |
| Background verifier | AI4Bharat IndicConformer (CTC) on a Python service |
| Offline text drafting | LLM API (prompt/cue drafts for SLP approval, summaries) |
| Tests | Vitest, Playwright |

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in keys
npm run dev
```

Open http://localhost:3000.

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm test` | Run unit tests |
| `npm run lint` | Lint |
| `npm run build` | Production build |

### Environment variables

See [.env.example](.env.example).

## Project layout

```
app/            Next.js pages and API routes
lib/engine/     Pure therapy logic: state machine, scorer, scheduler, Hindi normaliser, safety
lib/speech/     Sarvam STT and TTS clients
supabase/       Database migrations
research/       Research pack (clinical, competitive, technical, regulatory, MVP)
PLAN.md         Website MVP plan
```

## Safety and privacy

- PhirSe is not an emergency service. For new stroke signs, call 112 or 108 at once.
- Data is hosted in India. Recording, SLP access and any demo use need separate consent. Families can stop and delete all data at any time.
- Automatic scores are for SLP review only.

## License

To be decided.
