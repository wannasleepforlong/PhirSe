# 02 — Existing Apps & Competitive Landscape

Oct 16, 2026 · @Sales

## Bottom line

Good aphasia therapy apps exist and have trial evidence, but every one of them is **a screen app (iPad, tablet or web), in English or European languages, that the patient must operate with their hands**. None delivers therapy as a phone call, and the few that list Hindi or Tamil (e.g. Seda) are early apps without speech scoring. The closest technical precedent, UCL's **iTalkBetter**, proves that automatic scoring of aphasic naming attempts can match a therapist and that it improves naming; PhirSe's job is to bring that idea to a voice call in Indian languages.

One important caveat: **Constant Therapy now offers Indian English**, so "no product serves India" is false for English-speaking urban patients with an iPad. PhirSe's real gap is: Hindi/Indic, no app, no screen, no literacy needed, and an SLP in the loop.

## Foreign aphasia therapy apps

These are the established products. All are self-practice apps on a screen; the strongest have published trial evidence.

| Product | Maker | What it does | Evidence | Price | Languages | Speech scoring? |
| --- | --- | --- | --- | --- | --- | --- |
| [Constant Therapy](https://apps.apple.com/app/id1472010034) | Constant Therapy Inc. (Boston University origin) | 1M+ exercises across 90+ therapy areas; adaptive difficulty; clinician app to assign home programs and review compliance | Claims 70+ studies; 800,000+ users | US$24.99/month or US$249.99/year ([app listing](https://apps.appfollow.io/ios/constant-therapy/575764424?country=fr)); UK £22.99/month ([Stroke Association review](https://www.stroke.org.uk/stroke/effects/aphasia/therapy-apps/constant-therapy)) | US English, Spanish, **Indian English** | Some speech tasks; mainly tap-based |
| [Tactus Therapy](https://assistivetech.com.au/products/language-therapy-4-in-1-app-for-ipad) (Language Therapy 4-in-1 and 20+ apps) | Tactus Therapy Solutions, by an SLP in Canada | Naming, comprehension, reading, writing; cueing hierarchies; add your own words and photos | Cambridge study: every participant with chronic aphasia improved after 20 min/day for 4 weeks (company claim) | One-time purchase, \~US$119.99 (4-in-1); UK £69.99 ([Stroke Association review](https://www.stroke.org.uk/stroke/effects/aphasia/therapy-apps/tactus-therapy)) | US/UK English, Spanish, German, French | No automatic speech scoring of naming |
| [Lingraphica TalkPath Therapy](https://lingraphica.com/talkpath-therapy-aphasia-app/) | Lingraphica (US, aphasia devices since 1990) | 13,500+ language and cognitive exercises; SLPs assign homework and see reports | Company research; difficulty mapped to ASHA NOMS levels | Free; business model is Medicare-reimbursed AAC devices | English | Records speech for playback (iPad); no automatic scoring noted |
| [StepByStep](https://eprints.whiterose.ac.uk/149577) | Steps Consulting (UK) | Self-managed word-finding exercises tailored by an SLP | **Big CACTUS RCT** (278 people): +16.2 points on personally relevant words vs usual care; no gain in conversation | Licence-based | English | Not automatic in the trial (volunteer/assistant support) |
| [iTalkBetter](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11056404/) | UCL Queen Square Institute of Neurology (Leff lab) | Gamified confrontation naming of 200+ common words, with **real-time speech recognition** of whether the patient named the picture correctly | **Phase II RCT, 27 people**: naming of trained items +13% (avg. 29 words), no change on untrained, held at 3 months; spontaneous speech also improved | Being rolled out for free by UCL | English | **Yes: NUVA, a naming utterance verifier for aphasia**, with accuracy comparable to therapists |
| [AphasiaScripts](https://pmc.ncbi.nlm.nih.gov/articles/PMC2898202) | Shirley Ryan AbilityLab (Cherney) | Virtual therapist avatar trains personal conversation scripts: listen, speak in unison, then take turns | Multiple studies incl. a randomised factorial trial ([PMC9256784](https://pmc.ncbi.nlm.nih.gov/articles/PMC9256784)) | Research/clinic software | English (adapted for Spanish, Cantonese by others) | Limited |

**Two lessons from this table.**

1. **iTalkBetter is the proof of concept for PhirSe's technical core.** It works because its recogniser (NUVA) only has to decide "did they say *this* word?", not transcribe anything at all. The UCL PhD thesis behind NUVA found its accuracy equal or better than a commercial recogniser and in some patients on par with therapists, but also that reliability varied by patient ([UCL thesis](https://discovery-pp.ucl.ac.uk/id/eprint/10202755)). In the trial patients practised around 90 minutes a day ([NHE report](https://nationalhealthexecutive.com/articles/digital-app-usage-linked-speech-improvements-aphasia-patients-study-shows)), a dose no human service delivers.
2. **Every product assumes a screen and working hands.** Many survivors have right-side weakness, low literacy or no tablet. A phone call removes all three barriers, which is the structural opening for PhirSe in India.

## Atypical-speech recognition products

These are not therapy products. They help people with impaired speech be understood by machines. They matter to PhirSe because they show both the technical difficulty and the data gap for Indian languages.

| Product | What it does | Languages | Relevance |
| --- | --- | --- | --- |
| [Google Project Euphonia / Project Relate](https://blog.google/outreach-initiatives/accessibility/speech-accessibility-project/) | Euphonia collected impaired-speech data and cut median word error rates by more than 80% with adapted models. Relate (Android) asks users to record about 500 phrases to build a personal recogniser, with Listen, Repeat and Assistant features | English first; expanded to French, Japanese, Spanish; a Hindi pilot was announced for India ([Telegraph India](https://t2online.in/tech/tech-news/project-relate-is-going-to-pilot-in-hindi.-plus-focus-on-indian-languages/227394)) | Personalisation needs many recordings; PhirSe can avoid that by scoring against a known target word |
| [Speech Accessibility Project](https://blog.google/outreach-initiatives/accessibility/speech-accessibility-project/) (University of Illinois with major tech companies) | Large English dataset of impaired speech (Parkinson's, ALS, cerebral palsy, stroke) shared with researchers | English | Training data for English; nothing comparable exists in Hindi |
| [Voiceitt](https://www.tandfonline.com/doi/full/10.1080/10400435.2024.2328082) | App for people with dysarthric speech to communicate and control technology; tested with 66 participants in UK and Ireland | English | Communication aid, not therapy |
| [Avaz AAC](https://avazapp.com/products/avaz-aac-landing-page) (Chennai; acquired by PRC-Saltillo in Oct 2025) | Picture and text-based communication app for people who cannot speak, including aphasia | Six Indian languages: Hindi, Tamil, Kannada, Malayalam, Telugu, Marathi; customisable for Gujarati and Bengali | Compensatory (speaks for the user), not restorative therapy; mostly used with children |

**Key implication.** Indian-language dysarthric datasets are only beginning (e.g. the DAU-KDAH Hindi/Marathi/Gujarati/Indian English corpus, [APSIPA 2025](https://www.apsipa.org/proceedings/2025/papers/APSIPA2025_P502.pdf)). PhirSe cannot rely on an off-the-shelf impaired-speech recogniser in Hindi; it must be designed around constrained, target-aware scoring and SLP-checked labels (see doc 03).

## AI-native and new entrants (2025–2026)

The AI wave in this space is mostly **research prototypes and English/Spanish apps**. Nobody visible is doing a telephone voice agent for aphasia practice in Indian languages.

| Entrant | What it is | Stage |
| --- | --- | --- |
| [RehabilitIA](https://link.springer.com/chapter/10.1007/978-3-032-35390-0_13) | LLM agent workflows that generate personalised Spanish aphasia exercises (VNeST and spaced retrieval) under therapist supervision; expert evaluators agreed it could fit clinical practice | Academic, AIiH 2026 paper; web and mobile |
| [R-SPEAK](https://yesilscience.com/ai-speech-app-proves-usable-for-aphasia/) | Smartphone app turning broken speech of people with expressive aphasia into clear sentences using LLMs; models under 1.5B parameters hallucinated too often | Early usability test, 4 stroke survivors (Oct 2026) |
| [SpeakNow and companion prototype (Singapore)](https://arxiv.org/pdf/2603.22357) | Culturally grounded, multilingual aphasia therapy prototypes; authors plan LLM conversational agents for turn-taking practice | Not yet tested with patients |
| [Jessica by Better Speech](https://www.sprypt.com/blog/speech-therapy-ai-tools) | AI assistant using speech recognition and LLMs to give feedback on home practice between SLP sessions | Commercial, US |
| [AphaVoice](https://arxiv.org/abs/2610.14479) | Text-to-speech that synthesises realistic aphasic speech, for clinician training | IEEE SLT 2026 paper (Oct 2026) |
| [Revoice (Cambridge)](https://evramash.com/article/revoice-device-giving-stroke-patients-their-voice-back-with-ai) | Wearable that reconstructs words from silently mouthed speech for dysarthria, with an embedded small LLM | Research device |
| [VOICE prehospital stroke agent](https://arxiv.org/pdf/2507.22898) | Voice AI agent guiding prehospital stroke assessment; showed promise but over-called stroke and hallucinated | Research |

**What to take from this.**

- LLMs are good at generating personalised exercise content, but every serious group keeps a **therapist in the loop** and constrains generation. PhirSe should do the same: the LLM writes prompts and cues from an SLP-approved word list; it never invents medical content.
- LLM "understanding" of broken speech is risky for therapy scoring: R-SPEAK found small models hallucinate, and a model that guesses what the patient *meant* will mark wrong answers as right. PhirSe's scoring must be faithful to what was said, not to what was meant (doc 03).
- Hackathon projects like [Phonenix at TreeHacks](https://github.com/MakerofMarkers/treehacks2025) (English web app) and [SpeechProf](https://ai.google.dev/competition/projects/speechprof) (Gemini app) show the idea is attractive but stays at prototype. The bar to beat is **real patients, real SLP, real Indian language**.

## Indian and Indian-language products

There **are** a few Indic-language aphasia apps, mostly very early, plus several Indian speech-therapy apps for other conditions. All are screen apps; none is a voice agent on a phone call.

| Product | Who | Condition | Languages | Stage and notes |
| --- | --- | --- | --- | --- |
| [Seda Speech Therapy](https://hunted.space/product/seda-speech-therapy) | Independent founder (built after father's stroke) | Aphasia home practice, culturally relevant exercises | Arabic, Bengali, English, Filipino, **Hindi**, Indonesian, Punjabi, **Tamil**, Urdu | Product Hunt launch with minimal traction. **The closest direct competitor on language.** No evidence of speech scoring or SLP integration found |
| [SaLT (Smartphone-assisted Language Training)](https://researcher.manipal.edu/en/publications/smartphone-assisted-language-training-salt-in-aphasia-insights-fr/) | Manipal researchers | Clinician-prescribed aphasia home therapy for mono- and multilingual patients; remote monitoring | Multilingual | Pilot with 4 multilingual people with aphasia; academic |
| [MAT-APP (Kannada)](https://researcher.manipal.edu/en/publications/development-of-an-android-application-in-kannada-to-enhance-pictu/) | Manipal researchers | Picture naming (semantic and sound-based training) with a web monitoring interface | Kannada | Academic prototype |
| [Stamurai](https://www.indiascienceandtechnology.gov.in/hi/technologies/stamurai-speech-therapy-app-stammering) | Demosthenes Technologies, Delhi (BIRAC-funded) | Stammering | — | Clinical trials completed (TRL-8); claims under 1% of Indians have SLP access and therapy costs ₹40,000/year |
| [Svar](https://news.samsung.com/in/solve-for-tomorrow-speech-therapist-in-an-app-from-team-svar) | Student team, Samsung Solve for Tomorrow | Children's speech therapy, gamified | Regional languages | Competition project |
| [SLAQ AI Labs](https://startups.startupmission.in/startups/Z9Bmd) | Kerala startup (incorporated Dec 2025) | Stammering and speech disorders, AI assessment | — | Early startup |
| [Avaz AAC](https://avazapp.com/products/avaz-aac-landing-page) | Avaz (now PRC-Saltillo) | Augmentative communication, incl. aphasia | 6 Indian languages | Mature, but compensatory not restorative |
| Home therapy services, e.g. [MAX@Home](https://www.maxathome.in/doctors/speech-therapist/delhi), [HCAH](https://hcah.in/blog/speech-and-communication-challenges-after-stroke-how-to-overcome-aphasia) | Hospital chains, home-care companies | Human SLP visits, 30–45 min, 2–3x/week | Local languages | **Potential channel partners**, not competitors: PhirSe extends their therapists between visits |
| [Hindi Melodic Intonation Therapy](https://news.careers360.com/iit-delhi-aiims-ihbas-rolls-first-hindi-music-therapy-for-stroke-patients-research) | IIT Delhi, AIIMS, IHBAS | Severe nonfluent aphasia | Hindi | Research; the team says it is exploring digital tools to reach patients beyond specialist hospitals. **A potential research partner** |

**Honest read.** "Nothing exists in Hindi" is not true: Seda lists Hindi and Tamil, and Manipal has multilingual research apps. What does not exist is (a) therapy delivered as a **phone call**, (b) **automatic scoring of spoken Hindi/code-mixed naming**, and (c) an **SLP-prescribed loop** with daily data, all together.

## Gap analysis

PhirSe is the only option that combines a phone call, Indian-language spoken scoring and an SLP loop. Every column it wins is a requirement for the Indian home patient; it loses on breadth of exercises and on published evidence, which is expected for an MVP.

| Product | Needs smartphone/tablet and hands? | Works without literacy? | Hindi / code-mixed | Automatic spoken-answer scoring | SLP assigns and monitors | Trial evidence | Cost to patient |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Constant Therapy | Yes | Partly | Indian English only | Partial | Yes | Many studies (company) | \~US$25/month |
| Tactus Language Therapy | Yes (iPad/iPhone) | Partly | No | No | Via reports | Small study (company claim) | \~US$120 once |
| TalkPath Therapy | Yes | Partly | No | No | Yes | Company research | Free |
| StepByStep | Yes (computer) | Partly | No | No (in trial) | Yes | Big CACTUS RCT | Licence |
| iTalkBetter | Yes | Partly (pictures) | No | **Yes (NUVA)** | Not central | Phase II RCT | Free (UCL) |
| Seda | Yes | Unknown | **Yes, app** | Not found | Not found | None found | Unknown |
| Human home SLP | No | Yes | Yes | Human | Yes | Gold standard | ₹900+ per 45 min |
| **PhirSe (planned)** | **No: any phone, a call** | **Yes** | **Yes: Hindi, English, code-mixed** | **Yes: target-aware** | **Yes: SLP prescribes, sees every session** | None yet (pilot) | Target well below one SLP session per week |

Sources for each row are in the sections above.

## What to borrow, and what to avoid

| From | Borrow | Avoid |
| --- | --- | --- |
| iTalkBetter | Target-word verification instead of free transcription; trained vs untrained word lists; measure gain in words learned | Picture-only prompts (need a screen) |
| Big CACTUS / StepByStep | SLP tailors the word list; personally relevant words; daily practice for months | Claiming conversation or quality of life improves from word practice alone |
| Constant Therapy | Clinician dashboard: assign, see compliance, adjust; adaptive difficulty | Very broad 90-area library in the MVP; stay narrow |
| Tactus | Cueing hierarchy options; patients add their own words and family photos | — |
| TalkPath | Difficulty levels mapped to a clinical scale; free tier for families | — |
| AphasiaScripts | Personal scripts with choral speaking (speak together with the agent), then turn-taking; great Phase 2 feature on a phone call | Avatar dependence |
| RehabilitIA, R-SPEAK | LLM generates prompts and cues from SLP-approved content; therapist supervision | Letting an LLM guess what the patient meant when scoring |
| Seda | Culturally relevant items (Indian foods, festivals, family roles) | Shipping without scoring or clinician involvement |
| Home-therapy providers | Partner channel and trusted SLPs | Competing with them: PhirSe extends their therapists between visits |

## Sources

- [Constant Therapy Clinician, App Store](https://apps.apple.com/app/id1472010034) · [Constant Therapy pricing listing](https://apps.appfollow.io/ios/constant-therapy/575764424?country=fr) · [Stroke Association review: Constant Therapy](https://www.stroke.org.uk/stroke/effects/aphasia/therapy-apps/constant-therapy)
- [Tactus Language Therapy 4-in-1 listing](https://assistivetech.com.au/products/language-therapy-4-in-1-app-for-ipad) · [Stroke Association review: Tactus](https://www.stroke.org.uk/stroke/effects/aphasia/therapy-apps/tactus-therapy)
- [Lingraphica TalkPath Therapy](https://lingraphica.com/talkpath-therapy-aphasia-app/)
- [Big CACTUS, Lancet Neurology 2019](https://eprints.whiterose.ac.uk/149577)
- [iTalkBetter phase II trial, eClinicalMedicine 2024 (PMC11056404)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11056404/) · [HRA results summary](https://www.hra.nhs.uk/planning-and-improving-research/application-summaries/research-summaries/digital-interventions-in-neuro-rehabilitation-dinr-2/) · [NUVA thesis, UCL](https://discovery-pp.ucl.ac.uk/id/eprint/10202755) · [Trial NCT04566081](https://clinicaltrials.gov/study/NCT04566081)
- [AphasiaScripts (PMC2898202)](https://pmc.ncbi.nlm.nih.gov/articles/PMC2898202) · [Script training factorial trial (PMC9256784)](https://pmc.ncbi.nlm.nih.gov/articles/PMC9256784)
- [Google Project Euphonia / Speech Accessibility Project](https://blog.google/outreach-initiatives/accessibility/speech-accessibility-project/) · [Project Relate Hindi pilot](https://t2online.in/tech/tech-news/project-relate-is-going-to-pilot-in-hindi.-plus-focus-on-indian-languages/227394)
- [Voiceitt user study](https://www.tandfonline.com/doi/full/10.1080/10400435.2024.2328082) · [Avaz AAC](https://avazapp.com/products/avaz-aac-landing-page)
- [RehabilitIA, AIiH 2026](https://link.springer.com/chapter/10.1007/978-3-032-35390-0_13) · [R-SPEAK report](https://yesilscience.com/ai-speech-app-proves-usable-for-aphasia/) · [Singapore aphasia prototypes (arXiv 2603.22357)](https://arxiv.org/pdf/2603.22357) · [AphaVoice (arXiv 2610.14479)](https://arxiv.org/abs/2610.14479) · [SPRY speech therapy AI tools roundup](https://www.sprypt.com/blog/speech-therapy-ai-tools)
- [Seda Speech Therapy](https://hunted.space/product/seda-speech-therapy) · [SaLT app (Manipal)](https://researcher.manipal.edu/en/publications/smartphone-assisted-language-training-salt-in-aphasia-insights-fr/) · [MAT-APP Kannada (Manipal)](https://researcher.manipal.edu/en/publications/development-of-an-android-application-in-kannada-to-enhance-pictu/) · [Stamurai (BIRAC)](https://www.indiascienceandtechnology.gov.in/hi/technologies/stamurai-speech-therapy-app-stammering) · [Svar](https://news.samsung.com/in/solve-for-tomorrow-speech-therapist-in-an-app-from-team-svar) · [SLAQ AI Labs](https://startups.startupmission.in/startups/Z9Bmd)
- Hackathon precedents: [Phonenix, TreeHacks](https://github.com/MakerofMarkers/treehacks2025) · [SpeechProf, Gemini competition](https://ai.google.dev/competition/projects/speechprof)
