// Progress and agreement metrics for the SLP dashboard. Pure functions.

export interface AttemptLike {
  live_score: "correct" | "not_yet" | "uncertain";
  slp_label: "correct" | "incorrect" | null;
  phase: "warmup" | "practice" | "probe";
  word_set?: "treated" | "untreated" | "warmup" | "reserve" | null;
  session_id?: string;
  latency_ms?: number | null;
}

export interface Agreement {
  labelled: number;
  /** Agent decided (correct / not_yet) and SLP labelled. */
  decided: number;
  agree: number;
  accuracy: number | null;
  /** Agent said correct, SLP said incorrect: inflates progress. */
  falseAccepts: number;
  /** Agent said not_yet, SLP said correct: frustrates the patient. */
  falseRejects: number;
  uncertainLabelled: number;
  kappa: number | null;
}

/** Agreement of live scores with SLP labels. Uncertain attempts are reported apart, not counted as errors. */
export function agreement(attempts: AttemptLike[]): Agreement {
  const labelled = attempts.filter((a) => a.slp_label !== null && a.phase !== "warmup");
  const decided = labelled.filter((a) => a.live_score !== "uncertain");
  let tp = 0, tn = 0, fp = 0, fn = 0;
  for (const a of decided) {
    const agent = a.live_score === "correct";
    const slp = a.slp_label === "correct";
    if (agent && slp) tp++;
    else if (!agent && !slp) tn++;
    else if (agent && !slp) fp++;
    else fn++;
  }
  const n = decided.length;
  const agree = tp + tn;
  let kappa: number | null = null;
  if (n > 0) {
    const po = agree / n;
    const pe = ((tp + fp) / n) * ((tp + fn) / n) + ((tn + fn) / n) * ((tn + fp) / n);
    kappa = pe === 1 ? null : (po - pe) / (1 - pe);
  }
  return {
    labelled: labelled.length,
    decided: n,
    agree,
    accuracy: n ? agree / n : null,
    falseAccepts: fp,
    falseRejects: fn,
    uncertainLabelled: labelled.length - n,
    kappa,
  };
}

export interface ProbePoint {
  sessionId: string;
  date: string;
  treated: { correct: number; total: number };
  untreated: { correct: number; total: number };
}

/** Probe accuracy per session for treated vs untreated words. Uses the SLP label when present. */
export function probeSeries(
  attempts: Array<AttemptLike & { session_id: string; created_at: string }>,
): ProbePoint[] {
  const bySession = new Map<string, ProbePoint>();
  for (const a of attempts) {
    if (a.phase !== "probe" || (a.word_set !== "treated" && a.word_set !== "untreated")) continue;
    const p =
      bySession.get(a.session_id) ??
      { sessionId: a.session_id, date: a.created_at, treated: { correct: 0, total: 0 }, untreated: { correct: 0, total: 0 } };
    const bucket = a.word_set === "treated" ? p.treated : p.untreated;
    bucket.total++;
    const correct = a.slp_label ? a.slp_label === "correct" : a.live_score === "correct";
    if (correct) bucket.correct++;
    if (a.created_at < p.date) p.date = a.created_at;
    bySession.set(a.session_id, p);
  }
  return [...bySession.values()].sort((x, y) => x.date.localeCompare(y.date));
}

export interface SessionLike {
  started_at: string;
  minutes_active: number | null;
  end_reason: string | null;
}

/** Sessions and minutes in the 7 days up to `now`. */
export function weeklyAdherence(sessions: SessionLike[], now: Date = new Date()) {
  const since = now.getTime() - 7 * 24 * 3600 * 1000;
  const week = sessions.filter((s) => new Date(s.started_at).getTime() >= since);
  return {
    sessions: week.length,
    completed: week.filter((s) => s.end_reason === "completed" || s.end_reason === "time").length,
    minutes: Math.round(week.reduce((m, s) => m + (s.minutes_active ?? 0), 0)),
  };
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const v = [...values].sort((a, b) => a - b);
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
}
