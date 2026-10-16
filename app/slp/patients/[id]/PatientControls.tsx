"use client";

import { useTransition } from "react";
import { acknowledgeAlert, setPatientStatus } from "../../actions";

export function AckAlertButton({ alertId, patientId }: { alertId: string; patientId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => start(() => acknowledgeAlert(alertId, patientId))}
      className="rounded-full bg-alert px-3 py-1 text-white disabled:opacity-50"
    >
      {pending ? "Saving…" : "I have checked on the patient"}
    </button>
  );
}

export function StatusToggle({ patientId, status }: { patientId: string; status: string }) {
  const [pending, start] = useTransition();
  if (status === "withdrawn") return <span className="rounded-full bg-muted/20 px-3 py-1 text-sm">withdrawn</span>;
  const paused = status === "paused";
  return (
    <button
      disabled={pending}
      onClick={() => start(() => setPatientStatus(patientId, paused ? "active" : "paused"))}
      className={`rounded-full px-3 py-1 text-sm ${paused ? "bg-accent text-white" : "bg-calm/15 text-calm"}`}
    >
      {pending ? "…" : paused ? "Paused — resume practice" : "Active — pause practice"}
    </button>
  );
}
