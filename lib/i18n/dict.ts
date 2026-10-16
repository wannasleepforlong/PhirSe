// UI strings. "native" = Devanagari Hindi on patient/family screens and English on the SLP dashboard.
// "hinglish" = Roman-script Hindi as people type it, with everyday English words kept.

export type UiMode = "native" | "hinglish";
export const UI_COOKIE = "phirse_ui";

type Entry = { native: string; hinglish: string };
const e = (native: string, hinglish: string): Entry => ({ native, hinglish });

/** Patient and family screens. */
export const P = {
  brand: e("फिर से", "Phir Se"),
  readyTitle: e("आज का अभ्यास तैयार है", "Aaj ki practice taiyaar hai"),
  aiNote: e("यह कंप्यूटर की आवाज़ है, इंसान नहीं। आपकी थेरेपिस्ट ने शब्द चुने हैं।", "Yeh computer ki awaaz hai, insaan nahi. Aapki therapist ne shabd chune hain."),
  start: e("शुरू करें", "Shuru karein"),
  roomTip: e("शांत कमरे में बैठें। परिवार का कोई सदस्य पास रहे।", "Shaant kamre mein baithein. Parivaar ka koi sadasya paas rahe."),
  notEmergency: e("यह आपातकालीन सेवा नहीं है। नए स्ट्रोक लक्षण दिखें तो 112 या 108 पर कॉल करें।", "Yeh emergency service nahi hai. Naye stroke ke lakshan dikhein to 112 ya 108 par call karein."),
  micError: e("माइक की अनुमति चाहिए। ब्राउज़र में ऊपर 🔒 पर दबाएँ और माइक्रोफ़ोन चालू करें।", "Mic ki permission chahiye. Browser mein upar 🔒 dabaiye aur microphone allow kariye."),
  genericError: e("कनेक्शन टूट गया। फिर से शुरू करें दबाएँ।", "Connection toot gaya. Phir se Shuru karein dabaiye."),
  preparing: e("तैयारी हो रही है", "Taiyaari ho rahi hai"),
  speaking: e("सुनिए", "Suniye"),
  listening: e("आराम से सोचिए। मैं सुन रही हूँ।", "Aaram se sochiye. Main sun rahi hoon."),
  hearing: e("सुन रही हूँ", "Sun rahi hoon"),
  thinking: e("एक पल", "Ek pal"),
  asking: e("हाँ या नहीं बोलिए, या बटन दबाइए", "Haan ya nahi boliye, ya button dabaiye"),
  paused: e("रुके हुए हैं", "Ruke hue hain"),
  help: e("मदद", "Madad"),
  pause: e("रुकिए", "Rukiye"),
  skip: e("अगला", "Agla"),
  resume: e("चलिए", "Chaliye"),
  stopToday: e("आज के लिए बस", "Aaj ke liye bas"),
  yes: e("हाँ", "Haan"),
  no: e("नहीं", "Nahi"),
  showText: e("लिखा हुआ दिखाएँ", "Likha hua dikhaiye"),
  hideText: e("लिखा हुआ छिपाएँ", "Likha hua chhupaiye"),
  doneTitle: e("आज का अभ्यास पूरा", "Aaj ki practice poori"),
  doneBody: e("शाबाश। कल फिर मिलते हैं।", "Shabaash. Kal phir milte hain."),
  safetyTitle: e("अभ्यास रोक दिया गया है", "Practice rok di gayi hai"),
  safetyBody: e("नई परेशानी है तो अभी कॉल करें। लक्षण शुरू होने का समय नोट करें।", "Nayi pareshani hai to abhi call karein. Lakshan shuru hone ka samay note karein."),
  call112: e("112 पर कॉल करें", "112 par call karein"),
  call108: e("108 एम्बुलेंस", "108 ambulance"),
  safetyNotified: e("परिवार और थेरेपिस्ट को सूचना भेजी जा रही है।", "Parivaar aur therapist ko khabar bheji ja rahi hai."),
} satisfies Record<string, Entry>;

/** SLP dashboard and login. */
export const S = {
  dashboard: e("SLP dashboard", "SLP dashboard"),
  signOut: e("Sign out", "Sign out"),
  patients: e("Patients", "Mareez"),
  newPatient: e("Add patient", "Naya mareez"),
  noPatients: e("No patients yet. Add a patient you already treat to start home practice.", "Abhi koi mareez nahi. Jinka aap ilaaj karte hain, unhe add karke home practice shuru karein."),
  openAlerts: e("open safety alerts", "safety alerts khule hain"),
  thisWeek: e("This week", "Is hafte"),
  minutesOf50: e("Minutes of 50", "50 mein se minute"),
  lastSession: e("Last session", "Pichhla session"),
  words: e("Words", "Shabd"),
  alerts: e("Alerts", "Alerts"),
  sessions: e("sessions", "sessions"),
  complete: e("complete", "poore"),
  treated: e("treated", "practice wale"),
  graduated: e("graduated", "pakke ho gaye"),
  demo: e("demo", "demo"),
  editWords: e("Edit words", "Shabd badlein"),
  practiceWeek: e("Practice this week", "Is hafte practice"),
  agreement: e("Agreement with your labels", "Aapke labels se mel"),
  falseAccepts: e("False accepts", "Galat 'sahi'"),
  falseAcceptsHint: e("agent said correct, you said incorrect", "agent ne sahi kaha, aapne galat"),
  latency: e("Median answer time", "Jawab ka median samay"),
  probeTitle: e("Probe accuracy: practised and not practised words", "Probe accuracy: practice wale aur bina practice ke shabd"),
  noProbes: e("No probe sessions yet. The first session always starts with a probe.", "Abhi koi probe session nahi. Pehla session hamesha probe se shuru hota hai."),
  practised: e("practised", "practice wale"),
  notPractised: e("not practised", "bina practice"),
  cueTitle: e("Help needed per word", "Har shabd par kitni madad lagi"),
  cueHint: e("One cell per session. Darker green means the word came with less help.", "Har session ka ek khana. Gehra hara matlab kam madad mein shabd aaya."),
  sessionsTitle: e("Sessions", "Sessions"),
  review: e("Review", "Review karein"),
  open: e("open", "chalu"),
  resumePractice: e("Paused. Resume practice", "Ruka hua. Practice phir shuru karein"),
  pausePractice: e("Active. Pause practice", "Chalu. Practice rokein"),
  checkedOn: e("I have checked on the patient", "Maine mareez ko check kar liya"),
  safetyAlerts: e("Open safety alerts", "Khule safety alerts"),
  sessionReview: e("Session review", "Session review"),
  scored: e("Attempts scored", "Score hue attempts"),
  uncertain: e("uncertain", "pakka nahi"),
  labelled: e("Labelled by you", "Aapne label kiye"),
  labelledHint: e("your labels become the validation set", "aapke labels validation set bante hain"),
  minutes: e("Minutes", "Minute"),
  attempts: e("Attempts", "Attempts"),
  all: e("All", "Sab"),
  uncertainOnly: e("Uncertain only", "Sirf pakka nahi"),
  passA: e("Unbiased pass", "Bina jhukaav pass"),
  passB: e("Target-biased pass", "Target ki taraf pass"),
  verifier: e("Verifier", "Verifier"),
  yourLabel: e("Your label", "Aapka label"),
  correct: e("Correct", "Sahi"),
  incorrect: e("Incorrect", "Galat"),
  signInTitle: e("Sign in", "Sign in karein"),
  signInBody: e("For registered speech-language pathologists who supervise PhirSe home practice.", "Registered speech-language pathologists ke liye jo PhirSe home practice dekhte hain."),
  email: e("Work email", "Kaam ka email"),
  sendLink: e("Email me a sign-in link", "Sign-in link email karein"),
  demoLogin: e("Continue as demo SLP", "Demo SLP ki tarah aage badhein"),
  demoNote: e("Simulated patient and role-play data only.", "Sirf simulated mareez aur role-play data."),
} satisfies Record<string, Entry>;

/** Public landing page. */
export const L = {
  headline: e("फिर से", "Phir se"),
  sub: e(
    "Daily Hindi word-finding practice for people with aphasia after stroke, prescribed and watched over by their speech therapist.",
    "Stroke ke baad aphasia wale logon ke liye roz ki Hindi shabd practice, unki speech therapist ki nigraani mein.",
  ),
  ladderTitle: e("How one word comes back", "Ek shabd kaise wapas aata hai"),
  trySession: e("Open the therapist demo", "Therapist demo kholein"),
  slpSignIn: e("Therapist sign in", "Therapist sign in"),
  patienceTitle: e("It waits", "Yeh intezaar karta hai"),
  patienceBody: e(
    "Finding a word can take eight seconds or more. PhirSe never cuts in and never says wrong. Silence brings the next hint.",
    "Shabd dhoondhne mein aath second ya zyada lag sakte hain. PhirSe beech mein nahi bolta, kabhi 'galat' nahi kehta. Chup rehne par agla hint aata hai.",
  ),
  honestTitle: e("It is honest about what it heard", "Jo suna, uske baare mein imaandaar"),
  honestBody: e(
    "Each answer is checked twice against the target word. When the recogniser is unsure, the therapist decides, not the software.",
    "Har jawab target shabd se do baar check hota hai. Jab recogniser pakka nahi hota, faisla therapist karti hai, software nahi.",
  ),
  safeTitle: e("It stops for warning signs", "Khatre ke sanket par ruk jaata hai"),
  safeBody: e(
    "Words like dizziness, weakness or chest pain end the session and alert the family and the therapist.",
    "Chakkar, kamzori ya seene mein dard jaise shabd session rok dete hain aur parivaar aur therapist ko alert jaata hai.",
  ),
  footer: e("PhirSe is not an emergency service. For new stroke signs, call 112 or 108 at once.", "PhirSe emergency service nahi hai. Naye stroke ke lakshan par turant 112 ya 108 call karein."),
} satisfies Record<string, Entry>;

export function pick(entry: Entry, mode: UiMode): string {
  return entry[mode];
}

export function parseMode(value: string | undefined | null): UiMode {
  return value === "hinglish" ? "hinglish" : "native";
}
