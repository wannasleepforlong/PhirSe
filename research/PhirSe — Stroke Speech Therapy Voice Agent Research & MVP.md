# 01 — Clinical Foundations: Post-Stroke Speech & Language Therapy

Oct 16, 2026 · @Sales

## Purpose of this research pack

This pack is the evidence base for PhirSe, a phone-call voice agent that gives stroke survivors daily speech and language practice in Hindi, for the Bolna Symphony Buildathon (submission deadline 31 Oct 2026). It is written so a non-clinician engineer can build responsibly, and so a speech-language pathologist (SLP) can check the reasoning.

The pack has five docs, each exportable to Markdown:

1. **01 — Clinical Foundations** (this doc): the disorders, the evidence, official guidelines, techniques, outcome measures, safety and the India context.
2. **02 — Existing Apps & Competitive Landscape**: foreign and Indian products, what they do, their evidence, and the gap.
3. **03 — Technical Research**: speech recognition for impaired speech, scoring, turn-taking, Indic speech stack, Bolna and telephony.
4. **04 — Regulation, Ethics & Consent (India)**: data protection, medical-device and telemedicine rules, consent.
5. **05 — MVP Plan**: scope, architecture, session design, metrics, 15-day timeline and risks.

Nothing here is medical advice. Every clinical choice in the MVP must be confirmed by a licensed SLP before a patient uses it.

## 1. The disorders and how common they are

Stroke causes three different speech and language problems, and they need different exercises. The agent must know which one a patient has, because an SLP diagnoses this, not the software.

| Disorder | What is broken | What it sounds like | How common after stroke |
| --- | --- | --- | --- |
| **Aphasia** | Language: finding, forming and understanding words (usually left-hemisphere damage) | Word-finding pauses, wrong words ("table" for "bed"), wrong sounds ("wishdasher"), short broken phrases, or fluent but meaningless speech | 25–50% of strokes in Western data; 21–38% of survivors in India |
| **Dysarthria** | Muscle control of speech (weak or uncoordinated lips, tongue, voice) | Slurred, slow, quiet or nasal speech; language itself is intact | 20–42% of survivors |
| **Apraxia of speech** | Planning the mouth movements for speech | Groping, inconsistent sound errors, effortful starts | Often co-occurs with aphasia; SLP must differentiate |

Key facts from the American Speech-Language-Hearing Association (ASHA) Practice Portal on aphasia:

- Aphasia is described as **nonfluent** (short, effortful utterances, e.g. Broca's) or **fluent** (long but empty or jargon-filled, e.g. Wernicke's), and a person's type can change as they recover.
- **Anomia (difficulty retrieving words) is essentially universal** across all people with aphasia. This is why naming practice is the core of most home programs, and the core of this MVP.
- Aphasia is more common with age: 15% of people under 65 get it after a first ischemic stroke, rising to 43% at 85+.
- The strongest predictor of long-term recovery is initial severity, plus lesion site and size. **Post-stroke depression and social isolation slow improvement.**
- Language and cognition are separate: aphasia does not imply reduced intelligence. The agent must never talk down to patients.
- In multilingual people, each language can be affected differently, and treatment happens in the language(s) the person actually uses. This matters for Hindi/English/regional-language speakers.
- ASHA explicitly lists understanding speech **over the telephone, without visual support** as a common comprehension difficulty. A phone-only product must use slow, short, simple prompts and check understanding.

**India scale.** ICMR's National Stroke Registry Programme reports a pooled crude stroke incidence of 138.1 per 100,000 (age-standardised 103.4) across five regions. An Indian expert group estimates aphasia persists in 21–38% of stroke survivors, about **2 million people with aphasia** in India. Non-progressive dysarthria is estimated in 20–42% of stroke survivors.

Sources: [ASHA Aphasia Practice Portal](http://www.asha.org/Practice-Portal/Clinical-Topics/Aphasia/) · [Expert Group Meeting on Aphasia, Indian Academy of Neurology (PMC6472241)](https://pmc.ncbi.nlm.nih.gov/articles/PMC6472241) · [ICMR-NCDIR National Stroke Registry dataset](https://nhrdr.icmr.org.in/datasets/stroke-incidence-mortality-subtypes-in-rural-and-urban-populations-in-five-geographic-areas-of-india) · [Dysarthria post-stroke systematic review, BMC Neurology 2022 (PMC9479301)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9479301/)

## 2. What the evidence says

The evidence supports the product's core bet: therapy works, more practice works better, and self-managed technology practice adds real dose. It also sets a limit: self-practice improves the words you practise, not conversation in general.

| Study | Design | Key finding | What it means for PhirSe |
| --- | --- | --- | --- |
| [Cochrane review, Brady et al. 2016](https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.CD000425.pub4/full) | 57 RCTs, 3,002 participants | SLT beats no therapy on functional communication, reading, writing and expression. High intensity, high dose or longer duration did better, but high intensity is not acceptable to everyone (more dropouts). | Therapy is evidence-based. Daily short sessions are a way to raise dose without exhausting people. |
| [RELEASE IPD network meta-analysis, *Stroke* 2022](https://psyling.talkbank.org/years/2022/dosage.pdf) | 959 individual patients, 25 RCTs | Greatest gains with 20–50 total hours; frequent therapy (3–5 days/week); no comprehension gains at 20 hours or less, under 3 h/week or 3 days/week or fewer. Functionally tailored therapy with **prescribed home practice** did best. Gains were clinically equivalent for face-to-face, computer-supported and self-managed delivery. Usual care is 60–90 min/week early on, falling to 45 min/month later. | The single strongest justification: usual care delivers a fraction of the useful dose, and self-managed delivery can add it. Target 5 days/week. |
| [RELEASE subgroup analysis](https://eprints.gla.ac.uk/378514) | Same database, by time since stroke | Within 3 months: best gains at up to 2 h/week, 20–50 h total. After 3 months: best at 3–4 h/week, 50+ h total. | Chronic patients (the easiest to recruit at home) need more hours, which is exactly what humans can't supply. |
| [Big CACTUS, *Lancet Neurology* 2019](https://eprints.whiterose.ac.uk/149577) | RCT, 278 people with chronic aphasia, 21 UK NHS sites | Daily self-managed computer word-finding (StepByStep, 20–30 min/day, 6 months) improved finding of **personally relevant** words by 16.2 percentage points vs usual care, but **did not improve conversation**, participation or quality of life. | The closest precedent to PhirSe. Copy what worked (personal word lists, daily practice, SLT tailoring). Do not claim conversation improves. |
| [FCET2EC, *Lancet* 2017](https://evidence.nihr.ac.uk/alert/intensive-speech-therapy-helps-stroke-survivors-with-persistent-communication-difficulties) | RCT, 156 people with chronic aphasia (6+ months) | About 30 hours over 3 weeks (22 h 1:1, 9 h group, 15 h self-led exercises) improved everyday verbal communication; the waiting-list group on about 1 h/week did not improve. | Improvement is possible years after stroke if practice is intensive. Self-led exercises were part of the successful package. |
| [VERSE, *Int J Stroke* 2020](https://acuresearchbank.acu.edu.au/item/8w4y0/a-randomized-control-trial-of-intensive-aphasia-therapy-after-acute-stroke-the-very-early-rehabilitation-for-speech-verse-study) | RCT, 246 people within 14 days of stroke | Very early intensive therapy did not beat usual care at 12 weeks. Around 10 h/week vs 23 h/week made no difference. Lead author: therapy should be tailored to what the person can tolerate, with breaks to consolidate learning. | Don't target the acute hospital phase. Target the long, under-served home phase after discharge. |

**The honest claim PhirSe can make:** it adds structured, SLT-prescribed home practice in the patient's language, at a dose usual care rarely reaches. It should not claim to replace an SLT or to improve conversation on its own.

Sources: linked in the table.

## 3. What official guidelines recommend

Every major guideline now accepts digital or computerised therapy, but only as a **supplement supervised by an SLP**, never a replacement. That is the exact positioning PhirSe must take.

| Guideline | Body, year | What it says that matters for PhirSe |
| --- | --- | --- |
| [ESO guideline on aphasia rehabilitation](https://pmc.ncbi.nlm.nih.gov/articles/PMC12098336/) | European Stroke Organisation, 2025 | Recommends 20+ hours of SLT; suggests 4+ days/week and 3+ hours/week; therapy can be delivered in person **or digitally**; in-person therapy should be **augmented with digital therapy**; therapy should be tailored to be functionally relevant and at the right difficulty. |
| [2026 Guideline for Adult Stroke Rehabilitation and Recovery](https://www.neurologylive.com/view/aha-asa-issue-new-guideline-adult-stroke-rehabilitation-recovery) | American Heart Association / American Stroke Association, Aug 2026 (replaces 2016) | Computerised aphasia treatment supported as a **supplement** to traditional therapy (Class 2b, Level B-R). Communication disorders affect at least 30% of survivors. SLP take-home messages stress cultural background and pre-stroke language use ([AHA summary for SLPs](https://professional.heart.org/en/-/media/PHD-Files-2/Science-News/2/2026/Top-Take-Home-Messages-Stroke-Rehab-Speech-Language-Pathologists.pdf?sc_lang=en)). |
| [2016 AHA/ASA guideline](https://apps.asha.org/EvidenceMaps/Articles/ArticleSummary/0309dd96-6e02-4f1f-9e01-64732beec27c) (superseded, still widely cited) | AHA/ASA, 2016 | SLT recommended for aphasia (Class I, Level A). Computer-based treatment may supplement SLT. Communication-partner training should be part of treatment (Class I). |
| [National Clinical Guideline for Stroke](https://www.rcslt.org/news/new-national-clinical-guideline-for-stroke/) | UK & Ireland Intercollegiate Stroke Working Party, 2023 | People with aphasia should be able to keep improving **for as long as they make meaningful gains, under SLT supervision**. SLT at least 45 min/day, 5 days/week ([RCSLT confirmation](https://www.rcslt.org/news/confirmation-on-intensity-of-stroke-speech-and-language-therapy/)). In reality only 6.6% of UK patients got that in 2021–22, even in a rich health system. |
| [NPCDCS Guidelines for Prevention and Management of Stroke](https://medbox.org/dl/663dbce4f980b24635416736) | Ministry of Health & Family Welfare, Government of India, 2019 | India's national stroke guideline. Has a dedicated rehabilitation chapter and lists sudden trouble speaking or understanding as a stroke warning sign. Treat it as the Indian reference document; read its rehabilitation chapter before the SLP meeting. |
| [Expert Group Meeting on Aphasia](https://pmc.ncbi.nlm.nih.gov/articles/PMC6472241) | Indian Academy of Neurology and others, 2019 | Not a guideline but the Indian consensus: calls for validated Indian-language test batteries, an aphasia registry, and evidence-based rules for choosing the therapy language in multilingual patients. Notes Indian versions of the Western Aphasia Battery and Boston Diagnostic Aphasia Examination exist. |

**Design rules that follow:**

1. An SLP prescribes the program and can see every session; the agent never decides the diagnosis or the therapy plan.
2. Aim for daily practice, 5 days/week, adding to (not replacing) SLT sessions.
3. Tailor content to the patient's life (family names, foods, places) and to their difficulty level.
4. Practise in the language the patient used before the stroke, which the SLP chooses.
5. Include the family: partner training is a strong recommendation, and families can deliver practice when trained by an SLP.

## 4. Therapy techniques and which ones work over a phone call

The MVP should deliver **word-finding (anomia) practice with a cueing hierarchy**, because anomia is universal in aphasia, it has the strongest home-practice evidence (Big CACTUS), and it works by voice alone. Picture-based tasks need a workaround because a phone call has no screen.

| Technique | What happens | Phone-only? | MVP? |
| --- | --- | --- | --- |
| **Naming with a cueing hierarchy** | Patient tries to say a target word; if stuck, the clinician gives progressively stronger hints | Yes, if items are prompted by description, not pictures | **Core** |
| **Responsive naming** (naming to a description) | "What do you drink tea from?" → "cup" | Yes | **Core** (replaces picture naming) |
| **Sentence completion** | "Chai mein \_\_\_ daalte hain" → "cheeni" | Yes | **Core** (cue level and task) |
| **Repetition** | Patient repeats a word or phrase after the agent | Yes | **Core** (strongest cue level) |
| **Automatic speech** | Counting, days of week, familiar prayers or songs | Yes | **Core** (warm-up, confidence) |
| **Semantic Feature Analysis (SFA)** | Patient describes features of the word (where, what used for) to activate meaning | Yes, voice only | Phase 2 |
| **Phonological Components Analysis (PCA)** | Patient works out first sound, rhyme, syllables | Yes | Phase 2 |
| **Melodic Intonation Therapy (MIT)** | Intoning phrases on pitch and rhythm, for severe nonfluent aphasia with good comprehension | Partly; MIT also uses hand tapping and visual cues | Phase 2, only with SLP (a validated Hindi version was just developed by IIT Delhi, AIIMS and IHBAS) |
| **Script training** | Practising a personal script (e.g. ordering at a shop, phone call to a relative) until automatic | Yes | Phase 2 (high functional value) |
| **Constraint-Induced Language Therapy (CILT)** | Massed spoken practice, discouraging gestures | Phone naturally constrains to speech | Phase 2 |
| **Auditory comprehension tasks** | Yes/no questions, following simple commands | Yes, but phone comprehension is hard for many patients | Phase 2 |
| **Dysarthria exercises** (loudness, rate, clear speech) | Practise speaking louder, slower, over-articulating | Yes | Phase 2; Cochrane found **no definitive, adequately powered RCTs** for dysarthria interventions, so start with aphasia |

### The cueing hierarchy the MVP will use

This is the standard clinical pattern, as described on the ASHA Practice Portal (phonological and semantic cueing). Exact steps must be signed off by the SLP.

1. **Prompt:** a short description or sentence-completion frame.
2. **Semantic cue:** extra meaning ("you keep it in the kitchen").
3. **Phonemic cue:** the first sound or syllable ("ka…").
4. **Model:** the agent says the word; the patient repeats it.
5. **Move on warmly**, never leaving the patient stuck or failing repeatedly.

Research comparing **increasing** cues (start with least help, as above) and **decreasing** cues (start with the answer, fade help) found both improved naming with no clear winner; patients preferred decreasing cues because they failed less ([review, PMC4105211](https://pmc.ncbi.nlm.nih.gov/articles/PMC4105211)). The MVP should let the SLP choose the mode per patient.

### Why the phone channel is a feature, not only a limitation

- Telepractice for aphasia shows outcomes statistically similar to face-to-face for comprehension, naming and severity, though evidence quality is low ([Cacciante et al. 2021, via ASHA Evidence Map](https://apps.asha.org/EvidenceMaps/Articles/ArticleSummary/d2c20b00-096f-4ecf-b887-01e67ff44753)). Telephone delivery was used in the earliest telepractice studies ([systematic review, PMC4296832](https://pmc.ncbi.nlm.nih.gov/articles/PMC4296832)).
- A phone call needs no app, no literacy and no working right hand, which matters because many survivors have right-side weakness after a left-hemisphere stroke.
- The limitation is real: ASHA lists understanding speech without visual support, such as on the phone, as a common difficulty. Prompts must be short, slow and repeatable, and an optional picture card sent on WhatsApp before the call can bring back picture naming for patients whose family can show it.

Sources: [ASHA Aphasia Practice Portal](http://www.asha.org/Practice-Portal/Clinical-Topics/Aphasia/) · [Cochrane dysarthria review, Mitchell et al. 2017](https://ueaeprints.uea.ac.uk/62277/) · [Hindi MIT, Careers360 report on IIT Delhi/AIIMS/IHBAS](https://news.careers360.com/iit-delhi-aiims-ihbas-rolls-first-hindi-music-therapy-for-stroke-patients-research) · [AIIMS MIT Indian adaptation trial NCT06323330](https://clinicaltrials.gov/study/NCT06323330)

## 5. How progress is measured

In a 2-week pilot, PhirSe cannot claim recovery. It can measure **naming accuracy on practised versus unpractised words**, which is the standard way aphasia researchers measure naming therapy, plus adherence and family/SLP feedback.

### Standard clinical instruments (SLP-administered, not by the agent)

| Instrument | What it measures | India status |
| --- | --- | --- |
| Western Aphasia Battery (WAB / WAB-R), Aphasia Quotient | Overall aphasia severity and type; used as the anchor outcome in RELEASE | Indian versions exist (e.g. Bengali B-WAB, Malayalam); Indian-English bilingual norms published |
| Boston Diagnostic Aphasia Examination (BDAE) and Boston Naming Test | Diagnosis; picture naming | Indian version of BDAE exists |
| AIIMS Diagnostic Test of Aphasia | Hindi aphasia assessment | Listed in an international review of non-English tests |
| Bilingual Aphasia Test (BAT) | Compares languages in multilingual patients | Available in nine Indian languages, but lengthy; Malayalam short version validated |
| Frenchay Aphasia Screening Test (FAST), Indian adaptation | Bedside screening | Validated in Telugu and Kannada (ICMR Neuro-Cognitive Tool Box Consortium), literate and illiterate norms |
| Stroke and Aphasia Quality of Life Scale (SAQOL-39) | Quality of life | **Hindi version validated** (84 Hindi-speaking people with aphasia, test-retest ICC 0.9) |

### What the agent itself can measure (the MVP's metrics)

The design copies the single-case experimental method used in naming-therapy research: each patient has a set of **treated** words and a matched set of **untreated control** words, probed at baseline, during therapy and after. Aphasia LIFT used sets of 30 treated and 30 untreated items per participant; a VA trial of Semantic Feature Analysis scored each probe on a 0–10 scale for promptness and errors.

| Metric | How | Why it matters |
| --- | --- | --- |
| Naming accuracy, treated words | % correct without cue, per probe session | Primary signal of learning |
| Naming accuracy, untreated words | Same, on words never practised | Shows whether gains generalise (often they don't; be honest) |
| Cue level needed | Average step in the cueing hierarchy before success | Shows words getting easier before they're fully independent |
| Response latency | Seconds from prompt end to first attempt | Word retrieval speeds up with practice |
| Adherence | Sessions completed / scheduled; minutes practised per week | The dose argument from RELEASE; your strongest pilot result |
| Agreement with SLP | % agreement between agent scoring and SLP rating on the same recordings | Proves the scoring is trustworthy |
| SAQOL-39 (Hindi) | SLP-administered, baseline and end | Optional, only if the SLP has time |

All probes for the pilot should be scored by both the agent and the SLP so the numbers presented to judges are defensible.

Sources: [Expert Group Meeting on Aphasia (PMC6472241)](https://pmc.ncbi.nlm.nih.gov/articles/PMC6472241) · [Indian FAST adaptation, Ann Indian Acad Neurol 2020](https://doaj.org/article/be5e941547cd423fbcf9cd9673d510ab) · [Hindi SAQOL-39 validation](https://researcher.manipal.edu/en/publications/adaptation-and-validation-of-stroke-aphasia-quality-of-life-saqol-2/) · [Bengali WAB](https://reference-global.com/article/10.2478/plc-2013-0012) · [Malayalam short BAT (PMC5586114)](https://pmc.ncbi.nlm.nih.gov/articles/PMC5586114) · [Non-English aphasia tests table (PMC3747007)](https://pmc.ncbi.nlm.nih.gov/articles/PMC3747007/table/T1) · [Aphasia LIFT naming probes dataset](https://researchdata.edu.au/early-therapy-naming-treatment-response/3370458) · [SFA trial NCT00125242](https://clinicaltrials.gov/study/NCT00125242) · [WAB-R Indian-English norms](https://aphasiology.pitt.edu/2580)

## 6. Safety: what the agent must catch and escalate

The most serious risk is a **new stroke during or between calls**, because sudden new speech difficulty is itself a stroke warning sign, and the agent is listening to speech every day. The second is **depression**, which is common and more likely with aphasia. The agent never diagnoses; it alerts a human fast.

### Red flags and what the agent does

| Red flag | Why | Agent action |
| --- | --- | --- |
| Patient or family reports sudden new symptoms: loss of balance, vision change, face drooping, arm/leg weakness, new or worse speech difficulty (the **BE-FAST** signs) | BE-FAST adds Balance and Eyes to the classic FAST checklist; FAST alone misses about 14% of ischaemic strokes ([Aroor et al., *Stroke* 2017](https://pubmed.ncbi.nlm.nih.gov/28082668/)) | Stop the session immediately. Tell the family (call + WhatsApp) to call 112 / 108 now and note the time symptoms started. Notify the SLP. Never continue therapy. |
| Speech in today's session is **sharply and suddenly worse** than the patient's own recent baseline (e.g. new slurring, failure on easy items they reliably got) | Could be fatigue, illness, or a new stroke/TIA; the agent cannot tell which | End the session gently; same-day alert to family and SLP asking them to check on the patient using BE-FAST. Tune thresholds with the SLP to avoid false alarms. |
| Patient cries, says they want to give up, expresses hopelessness or self-harm | Post-stroke depression affects about 27% of survivors, mostly starting within 3 months; aphasia raises the risk (hazard ratio about 1.7) | Respond with warmth, end the exercise, alert family and SLP. Share an Indian mental-health helpline with the family, e.g. Tele-MANAS (verify the number before launch). Never counsel. |
| Repeated failure (e.g. 3 items in a row at the model/repetition step) or long silences | Frustration lowers engagement; VERSE authors stress tailoring intensity to tolerance | Drop to easier items or automatic speech, give praise, end early if needed. Log for the SLP. |
| Fatigue (slower responses, shorter answers late in session) | ASHA notes endurance and fatigue can require shorter sessions | Cap sessions at the SLP-set length (start at 10–15 min). Offer to stop. |
| Coughing or choking on the call | Swallowing problems (dysphagia) are common after stroke and are out of scope | Pause, ask a family member to check, do not resume until they confirm. |

### Why this matters for the product, not only for compliance

- Daily calls produce a daily speech baseline. That is a genuine safety benefit, but only if alerts reach a human within minutes. The MVP must have a working escalation path (family phone + SLP) before the first patient call.
- Depression is both a safety issue and a recovery issue: ASHA notes post-stroke depression and social isolation slow aphasia improvement. A warm, patient daily caller may reduce isolation, but this is a hypothesis, not a claim.

Sources: [BE-FAST, *Stroke* 2017 (PubMed 28082668)](https://pubmed.ncbi.nlm.nih.gov/28082668/) · [Wake Forest BE FAST sheet (Intermountain Healthcare)](https://www.wakehealth.edu/-/media/WakeForest/Clinical/Files/Stroke/FAST.pdf) · [Post-stroke depression meta-analysis, *PLOS Medicine* 2023](https://doaj.org/article/634722b65b6a440b94c8e834a2a6e062) · [Aphasia and depression risk, *Scientific Reports* 2024](https://doaj.org/article/b262faa9803a42379c9d8aebb19097e4) · [Mood disorders after stroke meta-analysis (aphasia as risk factor)](https://eprints.whiterose.ac.uk/138280) · [ASHA Aphasia Practice Portal](http://www.asha.org/Practice-Portal/Clinical-Topics/Aphasia/)

## 7. The India context

India has roughly 2 million people with aphasia and only a few thousand qualified speech professionals (most of whom also see children, hearing and swallowing cases). The evidence-based dose of 20–50 hours is out of reach for almost everyone, on both supply and cost.

| Fact | Figure | Source |
| --- | --- | --- |
| People living with aphasia | About 2 million (21–38% of stroke survivors) | [Expert Group Meeting on Aphasia](https://pmc.ncbi.nlm.nih.gov/articles/PMC6472241) |
| Registered audiologists + speech therapists (RCI) | Just over 6,000, for both professions combined | [Indian SLP aphasia survey (PMC12940862)](https://pmc.ncbi.nlm.nih.gov/articles/PMC12940862/) |
| Earlier ISHA estimate | About 2,500 qualified SLPs and audiologists (2015) | [Telepractice survey, Int J Telerehab 2017](https://telerehab.hpu.edu/index.php/Telerehab/article/view/6233/6733) |
| Telepractice use by Indian SLPs/audiologists | 12.19% of 205 respondents (2017); respondents reported an urgent shortage of professionals | [Mohan, Anjum & Rao 2017](https://doaj.org/article/c8add6cb936d46108a2a040361297790) |
| Typical private session price | ₹900 for 45 min (Bengaluru clinic); ₹800–2,000 per session (Kolkata); from ₹500 upwards (insurance guide) | [RxDx fee table](https://rxdx.in/?p=114521) · [Mpower](https://mpowerminds.com/blog/What-is-the-purpose-of-speech-therapy-How-much-does-a-speech-therapist-charge-in-Kolkata) · [Paytm Insurance guide](https://broking-internal.paytminsurance.co.in/health-insurance/articles/speech-therapy-coverage-under-health-insurance-policies-in-india/) |
| Typical home-therapy frequency | 30–45 min, 2–3 times per week | [MAX@Home Delhi](https://www.maxathome.in/doctors/speech-therapist/delhi) |

**The cost of the evidence-based dose.** At ₹900 per 45 minutes (₹1,200/hour), 20–50 hours of therapist time costs roughly **₹24,000–₹60,000** per patient, before travel or home-visit charges. A 2–3 sessions/week home schedule reaches 20 hours only after about 3–4 months. This is my calculation from the listed prices.

**What Indian SLPs themselves say they need.** A recent survey of Indian SLPs working in aphasia reported key challenges with bilingual and multilingual patients, and listed **better tele-rehabilitation and materials and mobile apps in Indian languages** as future directions ([PMC12940862](https://pmc.ncbi.nlm.nih.gov/articles/PMC12940862/)). The Indian expert group also called for digitising assessment and therapy in Indian languages ([PMC6472241](https://pmc.ncbi.nlm.nih.gov/articles/PMC6472241)). PhirSe is a direct answer to a gap the profession has named.

**Language reality.** Code-mixing (Hindi–English, regional language–English) is normal, and Indian bilinguals with aphasia often mix vocabulary and grammar across languages, which makes cross-language comparison difficult ([Expert Group](https://talkbank.org/aphasia/publications/2019/Pauranik19.pdf)). Scoring must accept a correct word in either language if the SLP allows it.

**Access gap in stories.** Families report that very few Indian doctors tell patients about aphasia and very few therapists know how to treat it ([Shirley Ryan AbilityLab patient story](https://www.sralab.org/research/labs/center-aphasia-research-treatment/news/how-shirley-ryan-abilitylabs-intensive-aphasia-program-helps-participants)). Indian SLPs also reported patients being less motivated and satisfied with tele-practice during COVID ([Bajaj & Karuppali 2022](https://impressions.manipal.edu/open-access-archive/5003)), so engagement design (warmth, personal content, family involvement) is not optional.

## 8. What this means for the product

1. **Scope the MVP to post-stroke aphasia word-finding.** It is universal in aphasia, has the best self-practice evidence (Big CACTUS: +16 percentage points on practised words), and works by voice. Leave dysarthria and apraxia for later.
2. **Target people at home, more than 3 months after stroke.** They are discharged, under-served, need 50+ hours, and VERSE showed the acute phase is not where extra intensity helps.
3. **Position as SLP-prescribed home practice.** Every guideline (ESO 2025, AHA/ASA 2026, UK 2023) supports digital therapy only as an SLP-supervised supplement. The SLP picks the words, the cue mode and the language; the agent delivers and reports.
4. **Personal words, not generic lists.** Big CACTUS and RELEASE both point to functionally tailored, personally relevant targets: family names, foods, places, things in the patient's own home.
5. **Daily, short, warm.** 10–15 minutes, 5 days/week, matching the RELEASE frequency findings and the dropout risk of very high intensity.
6. **Measure like researchers.** Treated vs untreated word sets, probes at baseline and end, cue level and latency, plus agent-vs-SLP scoring agreement.
7. **Claim only what the evidence supports.** "More practice, in your language, with progress your SLP can see" is defensible. "Restores speech" or "replaces therapy" is not.
8. **Safety first, before any patient call.** BE-FAST alerts, depression and distress escalation, fatigue limits, working family and SLP contacts.
9. **Design for the phone's limits.** Short slow prompts, no reliance on pictures (optional WhatsApp picture card), patience for long pauses, a choice of Hindi, English or code-mixed scoring set by the SLP.

## References

**Official guidance and professional bodies**

- [ASHA Practice Portal: Aphasia](http://www.asha.org/Practice-Portal/Clinical-Topics/Aphasia/) — American Speech-Language-Hearing Association
- [European Stroke Organisation guideline on aphasia rehabilitation, 2025 (PMC12098336)](https://pmc.ncbi.nlm.nih.gov/articles/PMC12098336/)
- [AHA/ASA 2026 Guideline for Adult Stroke Rehabilitation and Recovery — NeurologyLive summary](https://www.neurologylive.com/view/aha-asa-issue-new-guideline-adult-stroke-rehabilitation-recovery) and [AHA take-home messages for SLPs (PDF)](https://professional.heart.org/en/-/media/PHD-Files-2/Science-News/2/2026/Top-Take-Home-Messages-Stroke-Rehab-Speech-Language-Pathologists.pdf?sc_lang=en)
- [AHA/ASA 2016 guideline summary, ASHA Evidence Map](https://apps.asha.org/EvidenceMaps/Articles/ArticleSummary/0309dd96-6e02-4f1f-9e01-64732beec27c)
- [UK National Clinical Guideline for Stroke 2023 — RCSLT summary](https://www.rcslt.org/news/new-national-clinical-guideline-for-stroke/) and [RCSLT intensity confirmation](https://www.rcslt.org/news/confirmation-on-intensity-of-stroke-speech-and-language-therapy/)
- [MoHFW NPCDCS Guidelines for Prevention and Management of Stroke](https://medbox.org/dl/663dbce4f980b24635416736)
- [ICMR-NCDIR National Stroke Registry dataset](https://nhrdr.icmr.org.in/datasets/stroke-incidence-mortality-subtypes-in-rural-and-urban-populations-in-five-geographic-areas-of-india)
- [Expert Group Meeting on Aphasia, Ann Indian Acad Neurol 2019 (PMC6472241)](https://pmc.ncbi.nlm.nih.gov/articles/PMC6472241)

**Systematic reviews and trials**

- [Brady et al. Cochrane review of SLT for aphasia, 2016](https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.CD000425.pub4/full)
- [RELEASE Collaborators, Dosage, Intensity and Frequency, *Stroke* 2022 (PDF)](https://psyling.talkbank.org/years/2022/dosage.pdf)
- [RELEASE subgroup network meta-analysis](https://eprints.gla.ac.uk/378514)
- [Big CACTUS, *Lancet Neurology* 2019](https://eprints.whiterose.ac.uk/149577) and [NIHR summary](https://evidence.nihr.ac.uk/alert/computerised-speech-and-language-therapy-can-help-people-with-aphasia-find-words-following-a-stroke)
- [FCET2EC, *Lancet* 2017 — NIHR summary](https://evidence.nihr.ac.uk/alert/intensive-speech-therapy-helps-stroke-survivors-with-persistent-communication-difficulties)
- [VERSE, *Int J Stroke* 2020](https://acuresearchbank.acu.edu.au/item/8w4y0/a-randomized-control-trial-of-intensive-aphasia-therapy-after-acute-stroke-the-very-early-rehabilitation-for-speech-verse-study)
- [Cochrane review of dysarthria interventions, Mitchell et al. 2017](https://ueaeprints.uea.ac.uk/62277/)
- [Telerehabilitation for aphasia meta-analysis, Cacciante et al. 2021 (ASHA Evidence Map)](https://apps.asha.org/EvidenceMaps/Articles/ArticleSummary/d2c20b00-096f-4ecf-b887-01e67ff44753)
- [Telepractice in aphasia systematic review (PMC4296832)](https://pmc.ncbi.nlm.nih.gov/articles/PMC4296832)
- [Errorless/errorful and cueing review (PMC4105211)](https://pmc.ncbi.nlm.nih.gov/articles/PMC4105211)
- [Dysarthria post-stroke systematic review, BMC Neurology 2022](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9479301/)
- [BE-FAST, *Stroke* 2017](https://pubmed.ncbi.nlm.nih.gov/28082668/)
- [Post-stroke depression meta-analysis, *PLOS Medicine* 2023](https://doaj.org/article/634722b65b6a440b94c8e834a2a6e062) and [aphasia-depression cohort, *Scientific Reports* 2024](https://doaj.org/article/b262faa9803a42379c9d8aebb19097e4)

**India-specific**

- [Indian SLP aphasia rehabilitation survey (PMC12940862)](https://pmc.ncbi.nlm.nih.gov/articles/PMC12940862/)
- [Telepractice survey in India, Int J Telerehab 2017](https://doaj.org/article/c8add6cb936d46108a2a040361297790)
- [Hindi SAQOL-39 validation](https://researcher.manipal.edu/en/publications/adaptation-and-validation-of-stroke-aphasia-quality-of-life-saqol-2/)
- [Indian FAST adaptation, 2020](https://doaj.org/article/be5e941547cd423fbcf9cd9673d510ab)
- [Hindi Melodic Intonation Therapy, IIT Delhi/AIIMS/IHBAS](https://news.careers360.com/iit-delhi-aiims-ihbas-rolls-first-hindi-music-therapy-for-stroke-patients-research) and [AIIMS trial NCT06323330](https://clinicaltrials.gov/study/NCT06323330)
