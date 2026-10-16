# CLAUDE.md — PhirSe

Project guide for AI coding assistants working in this repo.

## What this is

PhirSe: self-serve, voice-first Hindi word-finding practice at home for people with aphasia after stroke. No accounts and no therapist required: a family member creates a practice profile and gets a private link (`/p/<token>` for practice, `/p/<token>/dashboard` for progress and words). A therapist is an optional extra who can be given the dashboard link. Website MVP for the Bolna Symphony Buildathon (deadline 31 Oct 2026). Plan: [PLAN.md](PLAN.md). Evidence: [research/](research/).

## Git rules (must follow)

- **Never mention Claude, Anthropic, or AI assistance in commits, commit trailers, PR titles/bodies, or code comments.** No `Co-Authored-By` lines. No "Generated with" footers.
- **Commit and push feature by feature.** One feature (or one coherent step) per commit, pushed to `origin main` right after it works and tests pass. Do not batch many features into one commit.
- Conventional Commits style: `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`.
- Remote: `https://github.com/wannasleepforlong/PhirSe` (branch `main`).
- Never commit secrets. `.env*` files stay local; only `.env.example` is committed.

## Stack

Next.js (App Router) + TypeScript + Tailwind · Supabase (Postgres, Storage; Mumbai region; accessed server-side with the service role after checking the private link token) · Sarvam STT (`saaras:v3` verbatim = pass A, `saaras:v4` + keyterms = pass B) · Sarvam Bulbul v3 TTS · Silero VAD in browser (`@ricky0123/vad-web`) · Claude API offline only (drafts, summaries) · Vitest + Playwright.

## Architecture rules

- The server owns the therapy state machine. The browser only plays audio, listens, uploads.
- `lib/engine/` holds pure functions (state machine, scorer, scheduler, normaliser, safety). No Next.js, DB or network imports there. Every change there needs unit tests.
- Nothing slow or optional in the live request path. Clarity scoring is a background job (`verifier/`): Sarvam with automatic language detection first; IndicConformer is only a lazily loaded backup for answers Sarvam cannot settle.
- The LLM never runs in the live session and never decides scores.
- Every TTS line goes through the shared clip cache (`lib/session/clips.ts`): content-addressed by text + voice, stored in Supabase, never tied to a profile. Never call `synthesize()` directly from a route.
- The patient never hears "wrong" (गलत). `uncertain` and `not_yet` both lead to the next cue.
- Close (fuzzy) matches are never auto-accepted as correct.
- Safety keyword matching stays deliberately broad.

## Commands

- `npm run dev` — dev server
- `npm test` — unit tests (Vitest)
- `npm run lint` — lint
- `npm run build` — production build

- `npm run verify` — typecheck, lint, tests and a production build into `.next-verify/`

Run `npm run verify` before each commit that touches code. Never run `npm run build` while the dev server is running: it overwrites `.next/` and breaks every dev request with `ENOENT … _buildManifest.js.tmp`.

## Clinical and privacy guardrails

- PhirSe is a practice tool, not a treatment. No diagnosis, severity rating, or "treats/restores speech" claims anywhere in UI or docs.
- AI disclosure in the first line of every session.
- No personal data in URLs or query strings beyond opaque access tokens.
