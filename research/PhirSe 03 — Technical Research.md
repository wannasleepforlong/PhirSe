# 03 — Technical Research

Oct 16, 2026 · @Sales

## Bottom line

Four problems decide whether PhirSe works. Each has a researched answer:

| Problem | Chosen approach |
| --- | --- |
| 1. Scoring aphasic answers honestly | Don't trust open transcription. Fast keyword match live; NUVA-style **target-word verification** offline; flag "uncertain" instead of guessing |
| 2. Turn-taking with long word-finding pauses | Per-patient patience window; silence means "give a cue", never "hang up"; agent stops talking the moment the patient speaks |
| 3. Hindi and code-mixed speech over 8 kHz phone audio | Sarvam Saaras (telephony, code-mix, verbatim mode) live; AI4Bharat IndicConformer (open-source CTC) for verification; slow Hindi TTS |
| 4. Orchestration | Bolna graph agent + scheduled outbound calls + custom function tools; a server-owned therapy state machine; post-call recording for scoring and SLP reports |

The biggest non-technical risk in this doc is **getting a phone number** (Bolna requires CIN/GST for purchased numbers). Resolve it in the first two days.

## Problem 1: scoring an aphasic answer correctly

The core technical claim of PhirSe is that it can tell, over a phone line, whether the patient said the target word. Research says **do not use open transcription for this; verify against the known target word**, which is what iTalkBetter's NUVA does.

### Why general speech recognition is the wrong tool

- **High error rates on aphasic speech.** Studies report around 37–48% word or syllable error rates on natural aphasic speech, and around 39% WER for spontaneous aphasic speech even after fine-tuning Whisper ([Dutch aphasia ASR, arXiv 2408.14082](https://export.arxiv.org/pdf/2408.14082); [Sanguedolce et al. 2024](https://aphasia.talkbank.org/publications/2024/Sanguedolce24.pdf)). Non-English is worse: Whisper large-v3 on French aphasic speech had character error rates about 32% higher than English ([ÉTS framework](https://pure.etsmtl.ca/en/publications/evaluating-asr-for-aphasia-a-framework-for-clinically-relevant-tr/)). Expect Hindi on 8 kHz phone audio to be harder still.
- **Hallucination.** On about 40 hours of AphasiaBank audio, Whisper invented entire sentences in a share of segments, and 38% of those hallucinations contained explicit harms (["Careless Whisper", Koenecke et al. 2024](https://talkbank.org/aphasia/publications/2024/Koenecke24.pdf)).
- **The "helpful correction" trap.** Modern recognisers use strong language models that pull a near-miss toward a real, likely word. In therapy that turns a phonemic error ("wishdasher") into the right answer and a semantic error ("bed" for "table") into whatever the context suggests. A recogniser that is "too good" makes the scoring dishonest. This is my engineering inference from how language-model decoding works; test it on real recordings.

### The proven alternative: target-aware verification

NUVA (UCL, used in iTalkBetter) treats scoring as a yes/no question: *does this attempt match the target word?* It turns the patient's attempt and recordings of healthy speakers saying the target into phone-posteriorgrams with a neural acoustic model, then compares them with dynamic time warping (DTW). On 8 British English speakers with aphasia it scored 83.6–93.6% accuracy (mean 89.5%), significantly better than Google speech-to-text and comparable in some cases to two independent therapists ([NUVA, *Computer Speech & Language* 2021](https://research.gold.ac.uk/id/eprint/30401); [arXiv](https://arxiv.org/pdf/2102.05408)). The underlying template method was designed to be **language-agnostic**, which is what makes it transferable to Hindi.

### Proposed PhirSe scoring stack (to validate with SLP labels)

| Layer | What it does | Decides |
| --- | --- | --- |
| 1. Fast pass: Indic streaming STT + keyword match | Transcribe the attempt; normalise Devanagari/Roman spellings; accept if the target or an SLP-approved synonym/English equivalent appears | Clear "correct" quickly, so the conversation keeps flowing |
| 2. Target verification (NUVA-style) | Compare the attempt with reference recordings of the target (from 2–3 healthy speakers, or high-quality TTS as a fallback) using a multilingual phone-posterior model and DTW; output a match score | "Correct / close / incorrect" when layer 1 is unsure |
| 3. Biased-vs-unbiased check | Decode once normally and once with the target boosted; if the target only appears when boosted, mark **uncertain** | Guards against the "helpful correction" trap |
| 4. Error type (offline, for the SLP report) | LLM labels the attempt from the transcript: semantic error (related word), phonemic error (similar sounds), no response, unrelated | SLP insight only; never changes the live score |

**Rule for the live conversation:** when scoring is uncertain, the agent never says "wrong". It moves to the next cue warmly ("Bahut accha try! Ek hint deti hoon..."), and the item is flagged for SLP review. This keeps the patient experience safe even when the recogniser is unsure.

## Problem 2: turn-taking for people who need time to find words

Every commercial voice agent is tuned to reply fast and treat silence as "the caller is done" or "the caller is gone". For a person with aphasia, a 4–8 second pause is often the *thinking*, and cutting in destroys the attempt. PhirSe needs **patience settings per patient**, chosen with the SLP.

### What the research says about time

- People with aphasia name more slowly and less consistently than healthy adults, and their response times do not always speed up with repetition ([anomic aphasia RT study, PMC6111491](https://pmc.ncbi.nlm.nih.gov/articles/PMC6111491); [consistency study, Frontiers 2015](https://doaj.org/article/90acb4a181ed41769d0789d469693a6c)).
- Extra time helps some patients and hurts others: in a 1 s vs 5 s response-delay study, accuracy rose for some people with aphasia and fell by up to 30% for others ([Martin et al., *Front Hum Neurosci* 2019](https://www.frontiersin.org/journals/human-neuroscience/articles/10.3389/fnhum.2019.00406/epub); [abstract](https://www.frontiersin.org/10.3389/conf.fnhum.2017.223.00110/event_abstract)). So there is no single right wait time; it is a per-patient setting.
- Comprehension is slower too: ASHA lists needing extra time to understand and difficulty with long or fast speech ([ASHA Practice Portal](http://www.asha.org/Practice-Portal/Clinical-Topics/Aphasia/)). The agent's speech must be slow, short and well-paused.

### What Bolna exposes (from its docs)

| Bolna setting | What it does | Default intent | PhirSe setting (starting point, tune with SLP) |
| --- | --- | --- | --- |
| **Endpointing** (Engine tab) | How long the agent waits after speech stops before responding | Fast replies | Much longer than default; per patient |
| **Linear delay** (Engine tab) | Extra delay before responding | — | Use to add patience on top of endpointing |
| **Number of words for interruption** | Words the caller must say before the agent stops talking | Avoid false interruptions | Low (1–2): if the patient starts speaking, the agent should stop at once |
| **Stopwords** ("stop", "wait", "hold on") | Always pause the agent immediately | — | Add Hindi equivalents ("ruko", "ek minute") if supported |
| **Hang up after silence** | Seconds of silence before ending the call; docs suggest 6–10 s for normal agents | Save minutes | **Raise substantially**; never hang up on a thinking patient |
| **Check if user is still there** (trigger after X s + check message) | Agent asks if the caller is still there | — | Replace with a gentle cue ("Koi baat nahi, aaram se...") |
| **Backchanneling** | Plays "mm-hmm" fillers | Avoid dead air | **Off** during an attempt (it can interrupt retrieval); maybe on during chit-chat |
| TTS speaking rate (synthesizer advanced config) | Voice speed | — | Slower than default |

Sources: [Bolna agent setup](https://www.bolna.ai/docs/graph-agent/agent-setup) · [Bolna: agent interrupts the caller](https://www.bolna.ai/docs/troubleshooting/agent-interrupts-users.md) · [Bolna call tab](https://www.bolna.ai/docs/agent-setup/call-tab.md) · [Bolna hangup](https://www.bolna.ai/docs/hangup-calls.md) · [Bolna: calls drop early](https://www.bolna.ai/docs/troubleshooting/calls-fail-or-drop-early.md)

### Design rule

Separate **"done answering"** from **"stuck"**. After the prompt, the agent waits up to the patient's patience window (e.g. 6–10 s, SLP-set). Silence past the window means *stuck*: give the next cue, not a hang-up and not a "Hello, are you there?". The response latency (prompt end to first sound) is logged per item, because faster retrieval is itself a sign of learning.

## Problem 3: the Indian-language speech stack

Use **Sarvam Saaras for live speech-to-text** (telephony-tuned, code-mixed, has a verbatim mode) and **AI4Bharat IndicConformer (open source, CTC)** for the offline target-verification layer. Both are Indian-built; Sarvam is also a buildathon sponsor.

| Component | Option | Why it fits | Watch out for |
| --- | --- | --- | --- |
| Live STT | [Sarvam Saaras v3](https://docs.sarvam.ai/api-reference-docs/getting-started/models/saaras.md) (Saaras V4 is now marketed on [sarvam.ai](https://www.sarvam.ai/apis/speech-to-text)) | 22 Indian languages + English; built for voice agents, **8 kHz telephony** and code-mixed speech; output modes include transcribe, **verbatim**, translit and codemix; **key-term prompting** to bias toward specific words; streaming API with VAD start/end signals ([streaming docs](https://docs.sarvam.ai/api-reference-docs/speech-to-text/apis/streaming)) | Verbatim mode and key-term prompting are exactly what the biased-vs-unbiased check needs; confirm both are reachable through Bolna, or call Sarvam directly in post-processing. Set the 8 kHz sample rate in both places the docs specify |
| Live STT inside Bolna | Sarvam transcriber in Bolna (added Sep 2025, 11 Indian languages) | Native integration, no glue code | Bolna's exposed model version and modes may lag Sarvam's latest ([Bolna changelog](https://www.bolna.ai/docs/changelog/september-2025)) |
| Offline verification | [AI4Bharat IndicConformer 600M multilingual](https://huggingface.co/ai4bharat/indic-conformer-600m-multilingual) | Open source (MIT), 22 languages, hybrid **CTC** + RNNT; CTC output gives per-frame posteriors needed for forced alignment and target-word likelihood scoring; per-language checkpoints exist ([GitHub](https://github.com/AI4Bharat/IndicConformerASR)) | Trained on typical speech; scoring thresholds must be tuned on SLP-labelled aphasic attempts |
| TTS (agent's voice) | Sarvam Bulbul v3 | Speaks code-mixed Hindi-English text naturally without romanisation ([Sarvam building-for-India guide](https://docs.sarvam.ai/api-reference-docs/building-for-india)); pronunciation dictionary available | Needs a **slow, warm, clear** voice; test speaking rate with patients |
| TTS alternatives | Cartesia, ElevenLabs (via Bolna) | Natural voices | Hindi prosody and code-switching vary by vendor; the agent must sound Indian, not dubbed |
| LLM | Any Bolna-supported LLM with tool calling | Only writes friendly wording around a fixed script | Must not decide scores or clinical steps (see Role of the LLM) |

**Telephone audio is hard mode.** Phone calls carry 8 kHz narrow-band audio, often with TV and family noise in Indian homes. Ask families to sit in a quiet room and use speaker-off handset mode; collect a few calibration words on day 1 to set per-patient thresholds.

## Problem 4: telephony and orchestration on Bolna

Bolna can place scheduled outbound calls, call your server mid-conversation through custom function tools, and give you the full recording and transcript after the call. That supports a clean split: **a fast, conservative live loop during the call, and accurate scoring after it.**

| Need | Bolna capability (from docs) | How PhirSe uses it |
| --- | --- | --- |
| Daily call at a fixed time | `POST /call` for single calls; `POST /batches` + `/batches/{id}/schedule` for CSV campaigns; schedules round up to the next 10-minute mark ([AGENTS.md](https://www.bolna.ai/docs/AGENTS.md)); auto-retry and outbound call timing restrictions ([call tab](https://www.bolna.ai/docs/agent-setup/call-tab.md)) | One scheduled call per patient per day; retry once if unanswered; never call outside family-approved hours |
| Structured therapy flow | **Graph agents** with nodes, per-node tools and LLM overrides ([agent setup](https://www.bolna.ai/docs/graph-agent/agent-setup)) | Nodes: greeting → warm-up → naming items → wrap-up → safety exit |
| Mid-call server logic | **Custom function tools** with headers and optional pre-call webhooks ([June 2026 changelog](https://www.bolna.ai/docs/changelog/june-2026.md)) | After each attempt, call `score_attempt(item, transcript)`; the server returns the next action (praise, next cue, next item, stop) |
| Post-call data | Execution payload with `transcript` ("speaker: text" lines) and `telephony_data.recording_url` once status is `completed`; webhooks fire several times per call ([payload reference](https://www.bolna.ai/docs/api-reference/executions/payload.md)) | Fetch the recording, segment attempts, run target verification, write the SLP report |
| Interim transcripts | Streaming interim transcript deltas as the caller speaks ([May 2026 changelog](https://bolna.ai/docs/changelog/may-2026)) | Optional: detect "stuck" vs "speaking" more precisely |
| Phone numbers | Buying a number on Bolna requires a compliance application with **CIN and GST certificates** (12–24 h review) ([Sep 2025 changelog](https://www.bolna.ai/docs/changelog/september-2025)) | **Risk for an individual builder.** Ask in the Bolna builders Slack about buildathon test numbers, or connect your own Plivo/Exotel account (also KYC-gated); fall back to Bolna web calls for the demo |
| Privacy | PII masking can null out recording URLs and extracted values | Check the setting: masking breaks offline scoring |

### The live loop, step by step

1. Agent asks the prompt (slow TTS).
2. Patience window runs (per patient).
3. Transcript of the attempt goes to `score_attempt`.
4. Server does a fast keyword/synonym match (Devanagari, Roman and English forms).
5. Clear match → praise, next item. No match or unsure → next cue level (never "wrong"). Cue ladder exhausted → model the word, patient repeats, move on.
6. Server logs item, cue level, latency and audio offsets.

The server, not the LLM, owns the therapy state machine. That makes the session deterministic, auditable by the SLP, and safe if the LLM misbehaves.

## Role and guardrails for the LLM

The LLM makes the call feel human; it does not practise medicine. Research groups building LLM aphasia tools keep generation constrained and therapist-supervised (RehabilitIA), and LLMs that interpret broken speech hallucinate, especially small ones (R-SPEAK) — see doc 02.

| The LLM may | The LLM may not |
| --- | --- |
| Phrase greetings, praise and encouragement warmly in Hindi/code-mixed language | Decide whether an answer is correct (the scorer does) |
| Turn SLP-approved word lists into prompts and cue sentences (e.g. description, sentence frame), **reviewed by the SLP before use** | Invent new therapy items, exercises or difficulty changes during a call |
| Recognise when the patient wants to stop, is upset or mentions new symptoms, and call the `safety_exit` tool | Give medical, medication or mental-health advice |
| Summarise the session in plain Hindi for the family and in clinical terms for the SLP (post-call) | Diagnose aphasia type or severity |
| Label error types for the SLP report (offline, clearly marked as automatic) | Tell the patient they are wrong, or compare them to others |

**Prompt-level guardrails.** Short sentences, one question at a time, never more than one instruction per turn; never finish the patient's word unless the server says "model step"; always offer a way out ("Aaj itna kaafi hai?").

**System-level guardrails.** Server-owned state machine; tool allow-list per graph node; safety keywords (Hindi and English) route straight to `safety_exit` regardless of LLM output; every session transcript visible to the SLP.

## Validating the scoring with the SLP

Copy NUVA's validation design: compare the system's correct/incorrect decisions with a speech therapist's ratings of the same recordings. NUVA reported accuracy against therapist ratings and compared it with two independent therapists and a commercial recogniser ([NUVA paper](https://research.gold.ac.uk/id/eprint/30401)).

**Data to collect (realistic for 2 weeks).**

- 100–200 single-word naming attempts, ideally from at least 3 patients, recorded over the phone line PhirSe actually uses (not studio audio).
- If patients are not yet available: the SLP role-plays typical errors (semantic errors, sound errors, long pauses, partial words) for a labelled starter set, clearly marked as simulated.
- For each attempt: target word, SLP label (correct / incorrect; plus error type if time allows), and a second SLP's label on a subset if possible.

**Metrics to report.**

| Metric | Why |
| --- | --- |
| Accuracy vs SLP | Headline number, comparable to NUVA's 89.5% mean in English |
| Sensitivity on correct answers | How often a correct attempt is recognised (missed successes frustrate patients) |
| Specificity on incorrect answers | How often an error is caught (false "correct" inflates progress) |
| Cohen's kappa (agent vs SLP; SLP vs SLP if available) | Agreement beyond chance; the SLP-vs-SLP value is the realistic ceiling |
| Share of attempts marked "uncertain" | Shows the system knows when it doesn't know |

Present results per layer (keyword match alone vs plus target verification) so judges see what the speech-research work added.

**Consent.** Recordings are health data; get explicit written consent for recording, SLP review and use in anonymised metrics (see doc 04).

## Sources

**Aphasic speech recognition**

- [NUVA: A Naming Utterance Verifier for Aphasia Treatment, Computer Speech & Language 2021](https://research.gold.ac.uk/id/eprint/30401) · [arXiv version](https://arxiv.org/pdf/2102.05408) · [Interspeech 2020 paper](https://www.isca-archive.org/interspeech_2020/barbera20_interspeech.html) · [PMC8117974](https://pmc.ncbi.nlm.nih.gov/articles/PMC8117974)
- [Careless Whisper: speech-to-text hallucination harms (AphasiaBank)](https://talkbank.org/aphasia/publications/2024/Koenecke24.pdf)
- [When Whisper Listens to Aphasia, Sanguedolce et al. 2024](https://aphasia.talkbank.org/publications/2024/Sanguedolce24.pdf)
- [Automatic recognition of Dutch aphasic natural speech (arXiv 2408.14082)](https://export.arxiv.org/pdf/2408.14082)
- [Evaluating ASR for aphasia framework (ÉTS)](https://pure.etsmtl.ca/en/publications/evaluating-asr-for-aphasia-a-framework-for-clinically-relevant-tr/)

**Timing in aphasia**

- [Martin et al. 2019, effect of delay on naming (Frontiers)](https://www.frontiersin.org/journals/human-neuroscience/articles/10.3389/fnhum.2019.00406/epub) · [Response time inconsistency (PMC6111491)](https://pmc.ncbi.nlm.nih.gov/articles/PMC6111491) · [Consistency of repeated naming](https://doaj.org/article/90acb4a181ed41769d0789d469693a6c)

**Speech stack**

- [Sarvam Saaras model docs](https://docs.sarvam.ai/api-reference-docs/getting-started/models/saaras.md) · [Sarvam streaming STT](https://docs.sarvam.ai/api-reference-docs/speech-to-text/apis/streaming) · [Sarvam building for India](https://docs.sarvam.ai/api-reference-docs/building-for-india) · [Sarvam STT product page](https://www.sarvam.ai/apis/speech-to-text)
- [AI4Bharat IndicConformer 600M (Hugging Face)](https://huggingface.co/ai4bharat/indic-conformer-600m-multilingual) · [IndicConformer GitHub](https://github.com/AI4Bharat/IndicConformerASR)

**Bolna**

- [Agent setup](https://www.bolna.ai/docs/graph-agent/agent-setup) · [Agent interrupts the caller](https://www.bolna.ai/docs/troubleshooting/agent-interrupts-users.md) · [Call tab](https://www.bolna.ai/docs/agent-setup/call-tab.md) · [Hangup](https://www.bolna.ai/docs/hangup-calls.md) · [Calls drop early](https://www.bolna.ai/docs/troubleshooting/calls-fail-or-drop-early.md)
- [AGENTS.md API facts](https://www.bolna.ai/docs/AGENTS.md) · [Execution payload](https://www.bolna.ai/docs/api-reference/executions/payload.md) · [API quickstart](https://www.bolna.ai/docs/quickstarts/api) · [Glossary](https://www.bolna.ai/docs/concepts/glossary)
- Changelogs: [Sep 2025](https://www.bolna.ai/docs/changelog/september-2025) · [May 2026](https://bolna.ai/docs/changelog/may-2026) · [June 2026](https://www.bolna.ai/docs/changelog/june-2026.md)
