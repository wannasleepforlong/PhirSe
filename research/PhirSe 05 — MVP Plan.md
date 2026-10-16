# 05 — MVP Plan

Oct 16, 2026 · @Sales

PhirSe MVP: a daily 10–15 minute Hindi phone call that runs SLP-prescribed word-finding practice for stroke survivors with aphasia, scores each attempt, and reports to the SLP and family. Submission due Oct 31, 2026.

## Scope

The MVP does one thing well: **word-finding practice by phone, in Hindi, with honest scoring and an SLP in the loop.** Everything else waits.

| In the MVP | Not in the MVP (Phase 2+) |
| --- | --- |
| Post-stroke aphasia, word-finding (naming) only | Dysarthria, apraxia, comprehension drills, reading/writing |
| Hindi + English + code-mixed answers | Other Indian languages (architecture supports them) |
| Responsive naming, sentence completion, repetition, automatic speech warm-up | Melodic intonation, script training, SFA/PCA, conversation practice |
| One scheduled outbound call per day, 10–15 min, 5 days/week | Inbound calls, on-demand practice, multiple daily sessions |
| SLP picks 20 treated + 20 untreated words per patient (personal words) | LLM-generated word lists without SLP review |
| Live: fast keyword scoring + cueing ladder; never says "wrong" | Live acoustic verification (too risky for latency in 2 weeks) |
| Post-call: target-word verification on the recording; SLP review | Fully automatic scoring with no human check |
| Simple SLP web dashboard; family WhatsApp summary (manual send is fine) | Insurance/billing, EHR integration, multi-clinic accounts |
| Safety exits: BE-FAST, distress, fatigue → alert family + SLP | Any diagnosis, severity rating or medical advice |

The clinical basis for every choice is in doc 01; the technical basis is in doc 03.

## Users and roles

| Role | Who | What they do in PhirSe |
| --- | --- | --- |
| **Patient** | Adult with post-stroke aphasia with word-finding difficulty, medically stable, at home, more than 3 months after stroke (best fit per doc 01), can hear and answer a phone, speaks Hindi (code-mixing fine) | Takes a 10–15 min call 5 days/week |
| **SLP** | RCI-registered speech-language pathologist who already treats the patient | Confirms suitability, chooses words and cue mode, sets patience window, reviews scores weekly, owns all clinical decisions |
| **Family member** | Lives with the patient | Gives consent with the patient, keeps the room quiet, is the emergency contact, gets a short daily WhatsApp summary |
| **Builder (you)** | — | Runs the system, never makes clinical calls, handles data under the consent |

**Exclude** (SLP decides): severe comprehension problems that make phone prompts unusable, recent stroke still in hospital, active depression or distress without clinical support, severe hearing loss without aids, anyone who cannot give informed consent even with aphasia-friendly support and family help.

## One session, minute by minute

A session is about 12 minutes and 10–15 practice items. Examples below are illustrative; the SLP approves the real wording.

| Minute | Block | What happens | Example (agent) |
| --- | --- | --- | --- |
| 0–1 | **Greeting + AI disclosure** | Name, AI disclosure, check it's a good time | "Namaste Sharma ji! Main PhirSe ki AI saathi hoon. Aapki therapist ne aaj ki practice bheji hai. Shuru karein?" |
| 1 | **Safety check** | One yes/no question on new problems | "Aaj tabiyat theek hai? Koi nayi pareshani?" → any new symptom → safety exit |
| 1–2 | **Warm-up (automatic speech)** | Counting, days of week, a familiar line | "Chaliye ek se das tak saath mein ginte hain..." |
| 2–10 | **Naming practice** (10–15 items) | For each item: prompt → patience window → score → cue ladder if needed → praise | Prompt: "Subah hum chai kis mein peete hain?" Semantic cue: "Yeh rasoi mein hota hai, haath se pakadte hain." Phonemic cue: "Ka..." Model: "Kap. Ab aap boliye: kap." |
| 10–11 | **Probe** (2–3 times per week only) | 5 treated + 5 untreated words, no cues, for measurement | "Ab bina hint ke kuch shabd..." |
| 11–12 | **Close** | Specific praise, tomorrow's time, easy stop option | "Aaj aapne 9 shabd khud bole. Kal 11 baje phir baat karenge." |

**Rules that apply all session.** One instruction per turn. Slow speech. Patient speech always interrupts the agent. Silence past the patience window triggers the next cue, never "Hello?". Three misses in a row → easier item or warm-up, then a short session. Any distress or BE-FAST word → safety exit immediately.

## Architecture

&#91;embedded content: PhirSe architecture · live call and post-call, 6 components\]

During the call, your server decides every step and Bolna only listens and speaks; after the call, the recording is re-scored and the SLP reviews attempts and adjusts the plan.

## Build checklist

**Voice agent (Bolna)**

- [ ] Graph agent: greeting → safety check → warm-up → naming loop → probe → close → safety exit
- [ ] Sarvam transcriber (Hindi, code-mix); slow warm Hindi TTS voice
- [ ] Endpointing, linear delay, interruption = 1–2 words, silence hang-up raised, backchanneling off during attempts
- [ ] Custom tools: `get_next_item`, `score_attempt`, `safety_exit`, `end_session`
- [ ] Webhook to receive execution payload on `completed`

**Therapy engine (your server)**

- [ ] Patient profile: language, patience window, cue mode, word lists (treated/untreated), schedule
- [ ] State machine per session: item order, cue level, misses in a row, time budget
- [ ] `score_attempt`: normalise Devanagari/Roman/English; accept target + SLP synonyms; return correct / not-yet / uncertain
- [ ] Safety keyword list (Hindi + English) mapped to `safety_exit`
- [ ] Event log: item, cue level reached, latency, transcript, audio offsets

**Post-call scoring**

- [ ] Fetch recording; segment attempts using logged offsets
- [ ] Reference audio for each target word (2–3 healthy speakers; TTS as fallback)
- [ ] Target verification with IndicConformer posteriors + DTW (NUVA-style); thresholds tuned on SLP labels
- [ ] Biased-vs-unbiased decode check; mark uncertain

**SLP dashboard (simple web app)**

- [ ] Patient list, adherence, per-word cue level and accuracy over days
- [ ] Play any attempt; one-click relabel (these labels become the validation set)
- [ ] Edit word lists, cue mode, patience window

**Family + safety**

- [ ] Daily WhatsApp summary in Hindi (manual send acceptable for the pilot)
- [ ] Alert path: safety exit → call + message to family and SLP within minutes
- [ ] Consent forms signed and stored; data deletion script tested

## Success metrics

These are targets for the 31 Oct submission and the interviews, not clinical claims. Honest misses are better than inflated numbers.

| Metric | Target | Minimum acceptable | Why it matters |
| --- | --- | --- | --- |
| Patients enrolled with SLP + consent | 5–10 | 2–3 (or SLP role-play) | Proof of real use |
| Session completion rate | ≥80% of scheduled calls | ≥60% | The dose argument (RELEASE, Big CACTUS) |
| Practice minutes per patient per week | ≥50 | ≥30 | Compare with usual care of \~60–90 min/week early, \~45 min/month later |
| Agent vs SLP scoring agreement | ≥85% accuracy, kappa reported | Reported honestly, any value | Shows the speech work is trustworthy (NUVA: 89.5% in English) |
| Treated-word accuracy, start vs latest probe | Upward trend | Data shown either way | Learning signal; untreated words shown alongside |
| Safety | Zero missed escalations; every alert reached a human | Same | Non-negotiable |
| SLP verdict | Written quote: "I would prescribe this between sessions" | Feedback on what to change | Credibility for judges |
| Family feedback | 2–3 short quotes or voice notes (with consent) | One | Emotional proof |

## Demo and pitch outline

The pitch should feel like a person's story backed by hard evidence, in under 5 minutes.

1. **The person (30 s).** A stroke survivor who knows the word "chai" but cannot say it. Two million Indians live with aphasia; about 6,000 audiologists and speech therapists serve the whole country.
2. **The gap (30 s).** Recovery needs 20–50 hours of practice; usual care gives a fraction, and every good app needs an iPad, English and working hands.
3. **Live call (60 s).** Ring a phone on stage. The agent runs three items, waits patiently through a pause, gives a phonemic cue, praises the success. Have a recorded backup.
4. **The hard part (45 s).** "Every voice agent optimises for speed; ours optimises for patience." Show the scoring stack: why open transcription lies about aphasic speech, and target-word verification vs SLP labels.
5. **Proof (60 s).** Patients enrolled, sessions completed, minutes practised, agreement with the SLP, treated-word trend, the SLP's quote, a family voice note (with consent).
6. **Why now, why us (30 s).** iTalkBetter proved the method in English; Indian speech models (Sarvam, AI4Bharat) and Bolna make a phone-native Hindi version possible now. Your speech-research background is the edge.
7. **What's next (30 s).** More languages, dysarthria and script training, partnerships with home-therapy providers and hospitals, the CDSCO pathway.

**Questions to rehearse.** Is this safe? (safety exits, SLP loop) · Does it work? (honest pilot numbers, cite Big CACTUS and iTalkBetter) · Who pays? (SLP clinics and home-care providers first, families second) · Isn't this a medical device? (yes eventually; pilot is SLP-directed, see doc 04).

## Risks and fallbacks

| Risk | Likelihood | Early signal | Fallback |
| --- | --- | --- | --- |
| No SLP agrees in time | Medium | No call booked by 20 Oct | Switch idea (see the earlier fallback ideas) or present a clinically-reviewed prototype with SLP role-play |
| SLP agrees but no patients in time | High | None started by 22 Oct | SLP role-plays typical errors; validated scoring on simulated set; pitch the pilot as starting in November |
| No phone number (Bolna CIN/GST rule; provider KYC) | Medium | Not solved by 18 Oct | Bolna web call for demo; ask Bolna builders Slack for test numbers; partner's business account |
| Hindi STT misses short single-word answers on phone audio | High | Low agreement in first 30 labelled attempts | Lean on SLP-approved synonyms + post-call verification; mark uncertain; never tell patient "wrong" |
| Agent cuts patients off | Medium | Patients or SLP report interruptions | Raise endpointing/linear delay per patient; disable backchanneling |
| Patient distress or a medical event during a pilot call | Low but serious | Any | Safety exit, family + SLP alerted, pause that patient's calls until SLP clears |
| Scope creep | High | Building features not in Scope | Re-read the Scope table daily |
| Overclaiming in the pitch | Medium | Any slide says "restores speech" | Use the honest claim in doc 01, section 2 |

## Open questions to resolve this week

**Ask Bolna (builders Slack)**

- [ ] Are buildathon credits or test phone numbers available for individuals without CIN/GST?
- [ ] Which Sarvam model version and modes (verbatim, key-term prompting) are exposed through Bolna's transcriber?
- [ ] Can a custom tool call be made after every user turn with low added delay? Any limit on tool calls per minute?
- [ ] Can endpointing be set per call via variables (per-patient patience)?
- [ ] Are interim transcript deltas available to custom tools during the call?

**Ask the SLP**

- [ ] Which patients fit, and which language do they prefer for therapy?
- [ ] Increasing or decreasing cues for each patient? What counts as correct (close sounds, English word, synonym)?
- [ ] Starting patience window and session length per patient
- [ ] Red-flag list and escalation steps they want
- [ ] Approvals needed at their workplace for a pilot like this
- [ ] Time for one hour of rating recordings next week

**Decide yourself**

- [ ] Name check: "PhirSe" ("again") or another name
- [ ] Hosting region and storage for recordings (India)
- [ ] Whether to work solo or recruit 1–2 teammates (frontend for dashboard; someone with SLP network)

## Related docs and sources

- [01 — Clinical Foundations](https://claude.ai/code/artifact/0beeb795-db4d-4071-9420-2f8e4079fdbc): disorders, evidence, guidelines, techniques, measures, safety, India context
- [02 — Existing Apps & Competitive Landscape](https://claude.ai/code/artifact/59fbf54c-7e47-412d-9ff3-e6b566e62766): Constant Therapy, Tactus, TalkPath, StepByStep, iTalkBetter, Seda and others
- [03 — Technical Research](https://claude.ai/code/artifact/cc96f49c-d39e-49c5-8062-f06b8ea1d183): scoring, turn-taking, Indian speech stack, Bolna
- [04 — Regulation, Ethics & Consent](https://claude.ai/code/artifact/da9300e1-32c9-4d42-92d5-bd7dd83823da): DPDP, CDSCO, RCI, ICMR, TRAI, consent form
- Buildathon: [Bolna Symphony Buildathon page](https://www.bolna.ai/symphony/buildathon/)

Key external sources used in this plan: [RELEASE dosage meta-analysis](https://psyling.talkbank.org/years/2022/dosage.pdf) · [Big CACTUS](https://eprints.whiterose.ac.uk/149577) · [iTalkBetter trial](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11056404/) · [NUVA](https://research.gold.ac.uk/id/eprint/30401) · [Bolna docs](https://www.bolna.ai/docs/AGENTS.md) · [Sarvam Saaras](https://docs.sarvam.ai/api-reference-docs/getting-started/models/saaras.md)
