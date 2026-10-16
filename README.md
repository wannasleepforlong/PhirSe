# PhirSe (फिर से — "again")

Voice-first Hindi word-finding practice at home for people with aphasia after a stroke. No account, no app, no appointment: a family member sets it up in a minute and gets a private link.

> PhirSe is a practice tool, not a treatment. It does not diagnose and is not an emergency service. It works on its own and alongside a speech therapist if the person has one.

## The problem

- About 2 million people in India live with aphasia after stroke. About 6,000 registered audiologists and speech therapists serve the whole country.
- Recovery evidence points to 20–50 hours of word practice (RELEASE, *Stroke* 2022). Most people get a fraction of that. Self-managed practice on personal words improved word-finding in trials (Big CACTUS, *Lancet Neurology* 2019).
- Good aphasia apps exist, but they need a tablet, English, literacy and working hands.

## What PhirSe does

1. Anyone opens the site, presses **Start free practice**, types how the voice should greet the person, and gets a private link. A starter list of 24 everyday Hindi words comes ready.
2. The person opens the link on a phone and presses one big button. A slow, warm Hindi voice runs a 10–15 minute session: warm-up, naming practice with a hint ladder (question, meaning hint, first sound, say it to repeat), and a short close.
3. It waits patiently through long word-finding pauses and never says "wrong".
4. Each answer is checked twice against the known word with two speech-to-text passes. When it is not sure, it gives the next hint instead of guessing.
5. The **dashboard** on the same link shows which words come easily, which need a hint and which are still hard, minutes practised, and check rounds on practised versus unpractised words. The family can add personal words (names, foods, places), hear each hint in the practice voice, and listen back to sessions.
6. **Safety:** a Help button and warning-sign words (dizziness, weakness, chest pain, distress) stop the session at once and show 112, 108 and a call button for the family. The dashboard shows the alert until the family confirms everyone is OK.
7. **Optional therapist:** share the dashboard link with a speech therapist; they see the same progress and can change the words.

## Cost control

Every spoken line is synthesised once and stored in Supabase Storage, keyed by its text and voice. All profiles share that cache, so only a profile's greeting ("नमस्ते शर्मा जी!") and any new words a family adds cost a TTS call.

## Status

Under active development for the Bolna Symphony Buildathon (Oct 2026). See [PLAN.md](PLAN.md) and [research/](research/).

## Tech stack

| Layer | Choice |
| --- | --- |
| Web app | Next.js (App Router), TypeScript, Tailwind CSS |
| Data and storage | Supabase (Mumbai region) |
| Speech-to-text | Sarvam Saaras (`saaras:v3` verbatim + `saaras:v4` with keyterms) |
| Text-to-speech | Sarvam Bulbul v3 (Hindi, slow pace), cached in Supabase |
| Voice activity detection | Silero VAD in the browser (`@ricky0123/vad-web`) |
| Tests | Vitest |

## Getting started

```bash
npm install
cp .env.example .env   # fill in keys
npm run dev
```

Open http://localhost:3000 and press **Start free practice**, or seed a demo profile:

```bash
node --env-file=.env scripts/seed-demo.mjs
```

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm test` | Run unit tests |
| `npm run lint` | Lint |
| `npm run verify` | Typecheck, lint, tests and a production build in a separate folder (safe while dev runs) |

### Environment variables

See [.env.example](.env.example).

## Project layout

```
app/                       Pages and API routes
app/start/                 Self-serve setup
app/p/[token]/             Practice screen
app/p/[token]/dashboard/   Family dashboard: progress, words, session review
lib/engine/                Pure logic: state machine, scorer, scheduler, Hindi normaliser, safety, metrics
lib/profile/               Profiles, private links, dashboard queries
lib/session/               Session service and the shared voice-clip cache
lib/speech/                Sarvam STT and TTS clients
lib/words/starter.json     Starter word list
supabase/                  Database migrations
research/                  Research pack
```

## Safety and privacy

- PhirSe is not an emergency service. For new stroke signs, call 112 or 108 at once.
- Data is hosted in India. Keeping recordings is a choice at setup. "Delete this practice" in the dashboard removes all words, sessions and recordings and turns off the link.
- No personal data in URLs beyond the opaque private link.

## License

To be decided.
