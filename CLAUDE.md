# CLAUDE.md — PhirSe

Project guide for AI coding assistants working in this repo.

## What this is

PhirSe: SLP-prescribed, voice-first Hindi word-finding practice for stroke survivors with aphasia. Website MVP for the Bolna Symphony Buildathon (deadline 31 Oct 2026). Full plan: [PLAN.md](PLAN.md). Evidence base: [research/](research/).

## Git rules (must follow)

- **Never mention Claude, Anthropic, or AI assistance in commits, commit trailers, PR titles/bodies, or code comments.** No `Co-Authored-By` lines. No "Generated with" footers.
- **Commit and push feature by feature.** One feature (or one coherent step) per commit, pushed to `origin main` right after it works and tests pass. Do not batch many features into one commit.
- Conventional Commits style: `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`.
- Remote: `https://github.com/wannasleepforlong/PhirSe` (branch `main`).
- Never commit secrets. `.env*` files stay local; only `.env.example` is committed.

## Stack

Next.js (App Router) + TypeScript + Tailwind · Supabase (Postgres, Auth, Storage; Mumbai region) · Sarvam STT (`saaras:v3` verbatim = pass A, `saaras:v4` + keyterms = pass B) · Sarvam Bulbul v3 TTS · Silero VAD in browser (`@ricky0123/vad-web`) · Claude API offline only (drafts, summaries) · Vitest + Playwright.

## Architecture rules

- The server owns the therapy state machine. The browser only plays audio, listens, uploads.
- `lib/engine/` holds pure functions (state machine, scorer, scheduler, normaliser, safety). No Next.js, DB or network imports there. Every change there needs unit tests.
- Nothing slow or optional in the live request path. The IndicConformer verifier is a background job.
- The LLM never runs in the live session and never decides scores. Patients only hear SLP-approved text.
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

- No diagnosis, severity rating, or "treats/restores speech" claims anywhere in UI or docs.
- AI disclosure in the first line of every session.
- No personal data in URLs or query strings beyond opaque access tokens.
