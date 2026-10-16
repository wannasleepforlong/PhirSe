// Starter word list every new practice profile gets. Families edit it in the dashboard.
import starter from "./starter.json";

export interface StarterWord {
  target: string;
  prompt: string;
  meaning?: string;
  also: string[];
}

export const STARTER_PRACTISED: StarterWord[] = starter.practised;
export const STARTER_CHECK: StarterWord[] = starter.check;

/** Rows for word_item. Practised words are drilled with cues; check words appear only in no-hint probes. */
export function starterRows(patientId: string) {
  return [
    ...STARTER_PRACTISED.map((w) => ({
      patient_id: patientId,
      set: "treated" as const,
      target_deva: w.target,
      prompt_text: w.prompt,
      semantic_cue_text: w.meaning ?? null,
      accepted_forms: w.also,
      source: "starter" as const,
    })),
    ...STARTER_CHECK.map((w) => ({
      patient_id: patientId,
      set: "untreated" as const,
      target_deva: w.target,
      prompt_text: w.prompt,
      semantic_cue_text: null,
      accepted_forms: w.also,
      source: "starter" as const,
    })),
  ];
}
