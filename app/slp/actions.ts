"use server";

import { revalidatePath } from "next/cache";
import { currentSlp, slpDb } from "@/lib/db/server";

const LABELS = new Set(["correct", "incorrect"]);
const ERROR_TYPES = new Set(["semantic", "phonemic", "no_response", "unrelated", "other"]);

/** SLP relabels one attempt. RLS limits updates to the SLP's own patients' attempts. */
export async function labelAttempt(attemptId: string, label: string | null, errorType: string | null) {
  const me = await currentSlp();
  if (!me) throw new Error("not signed in");
  if (label !== null && !LABELS.has(label)) throw new Error("bad label");
  if (errorType !== null && !ERROR_TYPES.has(errorType)) throw new Error("bad error type");
  const db = await slpDb();
  const { data, error } = await db
    .from("attempt")
    .update({
      slp_label: label,
      slp_error_type: label === "incorrect" ? errorType : null,
      labelled_at: label ? new Date().toISOString() : null,
    })
    .eq("id", attemptId)
    .select("session_id")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath(`/slp/sessions/${data.session_id}`);
}

/** Acknowledge a safety alert. The patient's practice stays paused until the SLP resumes it. */
export async function acknowledgeAlert(alertId: string, patientId: string) {
  const me = await currentSlp();
  if (!me) throw new Error("not signed in");
  const db = await slpDb();
  const { error } = await db
    .from("alert")
    .update({ acknowledged_at: new Date().toISOString(), acknowledged_by: me.slpId })
    .eq("id", alertId);
  if (error) throw new Error(error.message);
  revalidatePath(`/slp/patients/${patientId}`);
  revalidatePath("/slp");
}

export async function setPatientStatus(patientId: string, status: "active" | "paused") {
  const me = await currentSlp();
  if (!me) throw new Error("not signed in");
  const db = await slpDb();
  const { error } = await db.from("patient").update({ status }).eq("id", patientId);
  if (error) throw new Error(error.message);
  revalidatePath(`/slp/patients/${patientId}`);
}
