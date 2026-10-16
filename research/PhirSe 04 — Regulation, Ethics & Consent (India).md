# 04 — Regulation, Ethics & Consent (India)

Oct 16, 2026 · @Sales

## Bottom line

A small, SLP-supervised pilot is feasible in two weeks if it is run as **an SLP's home-practice tool for their own patients**, with explicit aphasia-friendly consent, AI disclosure on every call, minimal data, and no medical claims. Calling it a "study" or publishing results needs an ethics committee. Selling it later almost certainly needs a CDSCO medical device software pathway. This is not legal advice; confirm with the SLP's institution and, before any commercial launch, a regulatory lawyer.

| Area | Applies to the pilot? | What to do now |
| --- | --- | --- |
| Data protection (DPDP Act 2023 / Rules 2025; IT Act rules until May 2027) | Yes: voice recordings and health information | Written consent, purpose-limited, India-hosted, delete on request, breach plan |
| Medical device software (CDSCO, MDR 2017; July 2026 guidance) | Likely, for any product with a therapy purpose | No diagnosis or cure claims; clinician-directed; get regulatory advice before launch |
| Rehabilitation practice (RCI Act 1992) | Yes | A registered SLP prescribes and supervises; the agent never presents itself as a therapist |
| Research ethics (ICMR 2017) | Only if it is research (generalisable knowledge, publication) | Keep the pilot as clinical care plus product feedback; for any study, go through an ethics committee |
| Telecom calling rules (TRAI TCCCPR, 2025 amendment) | Yes at scale; low risk for a consented pilot | Explicit consent for calls; AI disclosure; plan for a 1600-series number later |

## Data protection

The DPDP Rules 2025 were notified on 13–14 November 2025 with an 18-month phased rollout. Consent-manager rules start after 12 months (November 2026); the core duties on notice, consent, security safeguards, breach reporting and retention start after 18 months, i.e. **13 May 2027** ([Mondaq summary](https://webiis08.mondaq.com/india/data-protection/1706890/a-closer-look-at-the-dpdp-rules-2025); [Khaitan & Co](https://www.khaitanco.com/sites/default/files/2025-11/ERGO%20-%20Digital%20Personal%20%20Data%20Protection%20Rules%20-%2015%20November%202025.pdf)). Until then, the old IT Act regime remains in force ([Hogan Lovells](https://www.hoganlovells.com/en/publications/indias-digital-personal-data-protection-act-2023-brought-into-force-)).

**Practical stance: build to DPDP now.** It is the law PhirSe will live under, and judges will ask.

| DPDP requirement | What it means for PhirSe |
| --- | --- |
| Clear notice and specific, unbundled consent ([Hogan Lovells](https://www.hoganlovells.com/en/publications/indias-digital-personal-data-protection-act-2023-brought-into-force-)) | Separate consent for (a) receiving calls, (b) recording, (c) SLP access, (d) anonymised use in metrics/demo |
| Easy withdrawal; delete data after withdrawal unless law requires keeping it | "Stop calls and delete my data" by WhatsApp or one phone call; honour within days |
| Reasonable security safeguards | Encrypted storage, India region, access only for the patient's SLP and the builder, audit log |
| Breach notice to affected people without delay and a detailed report to the Board within 72 hours ([Storyboard18](https://www.storyboard18.com/digital/breaking-govt-notifies-final-dpdp-rules-sets-staggered-rollout-with-key-obligations-for-data-fiduciaries-84201.htm)) | Write a one-page breach plan before day 1 |
| Penalties up to ₹250 crore for failing security safeguards ([compliance summary](https://compliancehub.wiki/india-dpdp-consent-manager-november-2026-phase-two-deadline-compliance/)) | Collect the minimum: no Aadhaar, no medical records beyond what the SLP shares |

**Vendor chain.** Audio flows through Bolna, the telephony provider, Sarvam and the LLM provider. List them in the consent notice, and check each one's data retention and region. For the demo, use recordings only with separate demo consent, or have the SLP role-play.

## Is PhirSe a medical device?

Probably yes, once it is sold for treating aphasia. CDSCO issued its final **Guidance Document on Medical Device Software** (CDSCO/MD/GD/MDSW/01/2026) on 21 July 2026 under the Medical Devices Rules 2017 ([Pure Global summary](https://www.pureglobal.com/news/india-cdsco-medical-device-software-guidance-2026); [Emergo by UL](https://www.emergobyul.com/news/india-cdsco-finalizes-guidance-medical-device-software)).

- **Scope:** any software intended for a medical purpose that meets the medical-device definition, including standalone software (SaMD), AI-enabled software and some mobile apps. CDSCO says the guidance reflects current practice under MDR 2017 rather than adding new controls ([BioSpectrum](https://biospectrumindia.com/news/16/28210/cdsco-releases-guidance-document-on-medical-device-software.html)).
- **Classification:** four risk classes, A (lowest) to D (highest), decided by intended use; the Central Licensing Authority confirms the class ([Emergo](https://www.emergobyul.com/news/india-cdsco-finalizes-guidance-medical-device-software); [MedTech Spectrum](https://www.medtechspectrum.com/medicaldevice-softwareindia)).
- **Out of scope examples** include software solely for medical teaching or training, and general wellness software within the limits the guidance sets ([MedTech Spectrum](https://www.medtechspectrum.com/medicaldevice-softwareindia)).
- **AI-specific expectation:** makers of AI-enabled medical software for India should show performance was evaluated in populations, settings and operating environments representative of intended use ([BioSpectrum](https://biospectrumindia.com/news/16/28210/cdsco-releases-guidance-document-on-medical-device-software.html)). For PhirSe this means validating scoring on Indian aphasic speech over Indian phone lines, which doc 03 already plans.

**How to position the pilot.**

1. Intended use stated as: *delivering home-practice exercises prescribed and supervised by a registered SLP*. No diagnosis, no severity rating, no "treats aphasia" claim.
2. The SLP makes every clinical decision; the software reports, it does not decide.
3. Mark automatic scores as "for SLP review".
4. Before charging money or scaling beyond a pilot, get a classification opinion. MDR 2017 also has rules for clinical investigation of devices, so ask whether a structured outcome study would count as one (I have not verified this against the rules text).

## Professional and telehealth rules

**RCI Act 1992.** Section 13 says no one other than a person with a recognised rehabilitation qualification enrolled on the Central Rehabilitation Register may practise as a rehabilitation professional in India; audiologists and speech therapists are among the registered categories ([RCI norms and guidelines](https://rehabcouncil.nic.in/norms-guidelines/); [Act text, India Code](https://www.indiacode.nic.in/bitstream/123456789/1977/1/A1992-34.pdf)).

What this means for PhirSe:

- The supervising SLP must be RCI-registered. Ask for their CRR number and record it.
- The agent must never introduce itself as a therapist or doctor. Say: "Main PhirSe ki AI saathi hoon. Aapki speech therapist ne yeh practice aapke liye chuni hai." ("I'm PhirSe's AI companion. Your speech therapist chose this practice for you.")
- Treatment planning, goal setting and discharge stay with the SLP.

**Telemedicine Practice Guidelines 2020.** These were issued for registered medical practitioners (doctors), not for SLPs, so they do not directly govern PhirSe. Their good-practice points (identify the patient, get consent, keep records, know when to escalate in person) are still worth copying. This is from general knowledge; I did not re-check the document in this research pass.

**Student SLPs.** If a master's student helps, their clinical work needs supervision by a qualified, registered SLP. Patient involvement should go through that supervisor.

## Research ethics

ICMR's National Ethical Guidelines (2017) apply to all biomedical, social and behavioural research for health in India involving human participants, their biological material and their data ([ICMR handbook](https://web.iitd.ac.in/~elangovan/ethics/doc/ICMR%20Guidelines%202018.pdf)). They sort research into four risk levels, from less than minimal risk to more than minimal risk ([ICMR Bioethics FAQ](https://ethics.ncdirindia.org/FAQ.aspx)).

Two points matter for PhirSe:

- **Exemption is narrow.** Institutional procedures based on ICMR allow exemption only for less-than-minimal-risk proposals with no linked identifiers, and the researcher cannot self-classify ([CIHSR SOP](https://irb.cihsr.in/initial-review-of-submitted-protocol/); [Burdwan University IEC](https://www.buruniv.ac.in/Downloads/Docs/IEC.pdf)). Voice recordings of identifiable patients will not qualify.
- **Vulnerable groups need full review even at minimal risk** in many committees' procedures ([Burdwan University IEC](https://www.buruniv.ac.in/Downloads/Docs/IEC.pdf); [MGMCRI categorisation](https://sbvu.ac.in/wp-content/uploads/2020/06/7.-Categorization-of-study.pdf)). People with aphasia, whose ability to understand consent may be affected, are likely to be treated as vulnerable.

**Decision for the buildathon.**

| If you want to... | Then |
| --- | --- |
| Let an SLP use PhirSe as a home-practice tool for their own patients and report usage and feedback | Treat as clinical care plus product feedback under the SLP; strong consent; no efficacy claims |
| Publish results, call it a "study", or claim PhirSe improves outcomes | Get ethics committee approval first (the SLP's institution or a registered independent committee); this takes weeks |

The line between these two is not always clear; the SLP's judgment and their institution's rules decide, not the builder.

## Calling rules and AI disclosure

TRAI amended the Telecom Commercial Communications Customer Preference Regulations (TCCCPR 2018) on 12 February 2025 ([TRAI press release 11/2025](https://cms.trai.gov.in/sites/default/files/2025-02/PR_No.11of2025.pdf)):

- Promotional calls use the **140** series; transactional and service calls use the newly allocated **1600** series; normal 10-digit numbers are restricted for these communications.
- Use of auto-dialers and robo-calls must be disclosed.
- Implicit consent for service and transactional communication lasts only as long as the relationship, and consent for an ongoing transaction lasts 7 days ([Fonearena summary](https://www.fonearena.com/blog/446114/trai-tcccpr-2025-tougher-rules-spam-calls-sms.html)).
- Reports say TRAI is considering further rules on AI-based calling, AI disclosure and consent verification ([Bar & Bench](https://www.barandbench.com/law-firms/view-point/trais-crackdown-on-spam-calls-and-ai-driven-telemarketing)).

**For PhirSe.** Therapy calls the patient asked for are closest to service calls, made with explicit consent. For the pilot, get written consent for the daily calls and have the family save the number with a clear name. At scale, plan for a 1600-series service number through the telephony provider.

**Disclose AI in the first sentence of every call.** It is the honest thing to do, it matches where TRAI is heading, and it matters in India specifically: families are being warned about voice-clone scams, so a call that sounds human but is not could frighten them. Never use a cloned voice of a real person, including family members.

## Consent checklist and one-page outline

Consent from a person with aphasia must be **aphasia-friendly**: short sentences, large print, pictures, one idea per line, read aloud, with a family member present and the SLP confirming the person understood. ASHA recommends aphasia-friendly formatting (large print, pictures) for written health materials ([ASHA Practice Portal](http://www.asha.org/Practice-Portal/Clinical-Topics/Aphasia/)). If the patient cannot understand even with support, the SLP decides whether they should take part at all.

### Before the first call

- [ ] SLP (RCI-registered) has agreed to supervise and has selected the patient
- [ ] Patient and family have heard the explanation in their language, with the SLP present or on the call
- [ ] Separate ticks for: daily calls; recording; SLP access to recordings; anonymised use in metrics; (optional) use of audio in the demo
- [ ] Emergency contacts recorded: family member + SLP, with call times
- [ ] Family told: this is not an emergency service; for stroke signs call 112 / 108 immediately
- [ ] How to stop: one WhatsApp message or call, and all data deleted
- [ ] Copy of the signed form given to the family

### One-page consent outline (English / Hindi)

| Section | English | हिंदी |
| --- | --- | --- |
| What it is | A computer voice will call you every day to practise words. It is not a person. | एक कंप्यूटर की आवाज़ रोज़ आपको शब्दों का अभ्यास कराने के लिए फ़ोन करेगी। यह इंसान नहीं है। |
| Who decides | Your speech therapist chooses the words and checks your progress. | आपके स्पीच थेरेपिस्ट शब्द चुनेंगे और आपकी प्रगति देखेंगे। |
| Recording | Calls are recorded so your therapist can listen. | कॉल रिकॉर्ड होंगी ताकि आपके थेरेपिस्ट सुन सकें। |
| Not an emergency service | If you have new stroke signs, call 112 or 108 at once. | अगर स्ट्रोक के नए लक्षण दिखें, तुरंत 112 या 108 पर कॉल करें। |
| Your choice | You can stop anytime. We will delete your recordings. | आप कभी भी बंद कर सकते हैं। हम आपकी रिकॉर्डिंग मिटा देंगे। |
| Data | Stored securely in India. Shared only with your therapist. | डेटा भारत में सुरक्षित रखा जाएगा। सिर्फ़ आपके थेरेपिस्ट के साथ साझा होगा। |
| Agreement | Tick yes/no for each item; patient (or thumbprint) and family member sign; SLP signs as witness. | हर बात के लिए हाँ/नहीं चुनें; मरीज़ (या अंगूठा) और परिवार के सदस्य हस्ताक्षर करें; थेरेपिस्ट गवाह के रूप में। |

Have the SLP review the wording, especially the Hindi, before use.

## Sources

- DPDP: [Mondaq, A Closer Look at the DPDP Rules 2025](https://webiis08.mondaq.com/india/data-protection/1706890/a-closer-look-at-the-dpdp-rules-2025) · [Khaitan & Co ERGO note](https://www.khaitanco.com/sites/default/files/2025-11/ERGO%20-%20Digital%20Personal%20%20Data%20Protection%20Rules%20-%2015%20November%202025.pdf) · [Hogan Lovells](https://www.hoganlovells.com/en/publications/indias-digital-personal-data-protection-act-2023-brought-into-force-) · [Storyboard18](https://www.storyboard18.com/digital/breaking-govt-notifies-final-dpdp-rules-sets-staggered-rollout-with-key-obligations-for-data-fiduciaries-84201.htm) · [Compliance Hub on penalties](https://compliancehub.wiki/india-dpdp-consent-manager-november-2026-phase-two-deadline-compliance/)
- CDSCO medical device software: [Pure Global](https://www.pureglobal.com/news/india-cdsco-medical-device-software-guidance-2026) · [Emergo by UL](https://www.emergobyul.com/news/india-cdsco-finalizes-guidance-medical-device-software) · [BioSpectrum](https://biospectrumindia.com/news/16/28210/cdsco-releases-guidance-document-on-medical-device-software.html) · [MedTech Spectrum](https://www.medtechspectrum.com/medicaldevice-softwareindia) · [Cyril Amarchand on the draft](https://corporate.cyrilamarchandblogs.com/2026/01/medical-device-as-software-has-cdsco-guidance-changed-the-rules/)
- RCI: [Norms and guidelines (Section 13)](https://rehabcouncil.nic.in/norms-guidelines/) · [RCI Act 1992, India Code](https://www.indiacode.nic.in/bitstream/123456789/1977/1/A1992-34.pdf)
- ICMR ethics: [National Ethical Guidelines handbook](https://web.iitd.ac.in/~elangovan/ethics/doc/ICMR%20Guidelines%202018.pdf) · [ICMR Bioethics FAQ](https://ethics.ncdirindia.org/FAQ.aspx) · [CIHSR review SOP](https://irb.cihsr.in/initial-review-of-submitted-protocol/) · [Burdwan University IEC](https://www.buruniv.ac.in/Downloads/Docs/IEC.pdf) · [MGMCRI study categorisation](https://sbvu.ac.in/wp-content/uploads/2020/06/7.-Categorization-of-study.pdf)
- TRAI: [Press release 11/2025](https://cms.trai.gov.in/sites/default/files/2025-02/PR_No.11of2025.pdf) · [Fonearena summary](https://www.fonearena.com/blog/446114/trai-tcccpr-2025-tougher-rules-spam-calls-sms.html) · [Bar & Bench on AI calling](https://www.barandbench.com/law-firms/view-point/trais-crackdown-on-spam-calls-and-ai-driven-telemarketing)
- Aphasia-friendly materials: [ASHA Aphasia Practice Portal](http://www.asha.org/Practice-Portal/Clinical-Topics/Aphasia/)
