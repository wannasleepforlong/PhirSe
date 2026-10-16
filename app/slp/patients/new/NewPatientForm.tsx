"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { createPatient } from "../../actions";

const CONSENTS = [
  ["sessions", "Daily practice sessions", true],
  ["recording", "Recording of attempts", true],
  ["slp_access", "Therapist can listen to recordings", true],
  ["anonymised_metrics", "Anonymised use in metrics", false],
  ["demo_use", "Use of audio in demos", false],
] as const;

type ConsentKey = (typeof CONSENTS)[number][0];

export default function NewPatientForm() {
  const [name, setName] = useState("");
  const [honorific, setHonorific] = useState("जी");
  const [familyName, setFamilyName] = useState("");
  const [familyPhone, setFamilyPhone] = useState("");
  const [consent, setConsent] = useState<Record<ConsentKey, boolean>>({
    sessions: false, recording: false, slp_access: false, anonymised_metrics: false, demo_use: false,
  });
  const [result, setResult] = useState<{ id: string; link: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (result) {
    const full = `${window.location.origin}${result.link}`;
    return (
      <div className="flex max-w-2xl flex-col gap-3 rounded-2xl bg-surface p-5 shadow-sm">
        <p className="font-semibold">Patient added. Share this practice link with the family.</p>
        <p className="text-sm text-muted">It is shown only once. Anyone with the link can start a session, so share it privately. You can issue a new link later.</p>
        <code className="break-all rounded-lg bg-white px-3 py-2 text-sm">{full}</code>
        <div className="flex gap-3">
          <button onClick={() => navigator.clipboard.writeText(full)} className="rounded-full bg-calm px-4 py-2 text-sm text-white">Copy link</button>
          <Link href={`/slp/patients/${result.id}/words`} className="rounded-full bg-accent px-4 py-2 text-sm text-white">Add words next</Link>
        </div>
      </div>
    );
  }

  const input = "rounded-lg border border-accent-soft bg-white px-3 py-2 text-base";
  return (
    <form
      className="flex max-w-2xl flex-col gap-4 rounded-2xl bg-surface p-5 shadow-sm"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          setError(null);
          try {
            setResult(
              await createPatient({ display_name: name, honorific, family_name: familyName || null, family_phone: familyPhone || null, consent }),
            );
          } catch (err) {
            setError((err as Error).message);
          }
        });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
        <label className="flex flex-col gap-1 text-sm">How the voice greets them (name)<input required value={name} onChange={(e) => setName(e.target.value)} placeholder="शर्मा" className={input} /></label>
        <label className="flex flex-col gap-1 text-sm">Honorific<input value={honorific} onChange={(e) => setHonorific(e.target.value)} className={input} /></label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">Family contact name<input value={familyName} onChange={(e) => setFamilyName(e.target.value)} className={input} /></label>
        <label className="flex flex-col gap-1 text-sm">Family phone (emergency contact)<input value={familyPhone} onChange={(e) => setFamilyPhone(e.target.value)} inputMode="tel" className={input} /></label>
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">Consent recorded on the signed form</legend>
        {CONSENTS.map(([k, label, required]) => (
          <label key={k} className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={consent[k]} onChange={(e) => setConsent({ ...consent, [k]: e.target.checked })} className="h-4 w-4" />
            {label} {required && <span className="text-xs text-muted">(required)</span>}
          </label>
        ))}
      </fieldset>
      {error && <p className="text-sm text-alert">{error}</p>}
      <button disabled={pending} className="self-start rounded-full bg-accent px-5 py-2 text-white disabled:opacity-50">{pending ? "Saving…" : "Add patient"}</button>
    </form>
  );
}
