"use client";

import { useState, useTransition } from "react";
import { deleteWord, saveWord, type WordInput } from "../../../actions";
import { firstAkshara } from "@/lib/session/scripts";

export interface WordRow {
  id: string;
  target_deva: string;
  set: WordInput["set"];
  accepted_forms: string[];
  prompt_text: string | null;
  semantic_cue_text: string | null;
  phonemic_cue_text: string | null;
  model_text: string | null;
  approved_at: string | null;
  leitner_box: number;
}

const SET_LABEL: Record<WordInput["set"], string> = {
  treated: "Practised (treated)",
  untreated: "Probe only (untreated)",
  reserve: "Reserve",
  warmup: "Warm-up",
};

type CueField = "prompt_text" | "semantic_cue_text" | "phonemic_cue_text" | "model_text";

async function preview(text: string, speaker?: string, pace?: number) {
  const res = await fetch("/api/slp/tts", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text, speaker, pace }),
  });
  if (!res.ok) throw new Error((await res.json()).error ?? "preview failed");
  const url = URL.createObjectURL(await res.blob());
  const audio = new Audio(url);
  audio.onended = () => URL.revokeObjectURL(url);
  await audio.play();
}

function WordForm({
  patientId,
  word,
  speaker,
  pace,
  onDone,
}: {
  patientId: string;
  word?: WordRow;
  speaker?: string;
  pace?: number;
  onDone?: () => void;
}) {
  const [f, setF] = useState({
    target_deva: word?.target_deva ?? "",
    set: word?.set ?? ("treated" as WordInput["set"]),
    accepted: (word?.accepted_forms ?? []).join(", "),
    prompt_text: word?.prompt_text ?? "",
    semantic_cue_text: word?.semantic_cue_text ?? "",
    phonemic_cue_text: word?.phonemic_cue_text ?? "",
    model_text: word?.model_text ?? "",
  });
  const [approve, setApprove] = useState(!!word?.approved_at);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const t = f.target_deva.trim();
  const defaults: Record<CueField, string> = {
    prompt_text: "",
    semantic_cue_text: "",
    phonemic_cue_text: t ? `यह ${firstAkshara(t)}… से शुरू होता है।` : "",
    model_text: t ? `${t}। अब आप बोलिए: ${t}।` : "",
  };

  const update = (k: keyof typeof f, value: string) => {
    setF({ ...f, [k]: value });
    setApprove(false); // any change needs fresh approval
  };

  const submit = () =>
    start(async () => {
      setError(null);
      try {
        await saveWord(patientId, {
          id: word?.id,
          target_deva: f.target_deva,
          set: f.set,
          accepted_forms: f.accepted.split(","),
          prompt_text: f.prompt_text,
          semantic_cue_text: f.semantic_cue_text,
          phonemic_cue_text: f.phonemic_cue_text,
          model_text: f.model_text,
          approve,
        });
        onDone?.();
      } catch (e) {
        setError((e as Error).message);
      }
    });

  const cue = (k: CueField, label: string, example: string) => {
    const text = f[k] || defaults[k];
    return (
      <label className="flex flex-col gap-1 text-xs text-muted">
        {label}
        <span className="flex gap-2">
          <input
            value={f[k]}
            onChange={(e) => update(k, e.target.value)}
            placeholder={defaults[k] || example}
            className="w-full rounded-lg border border-accent-soft bg-white px-2 py-1.5 text-base text-foreground"
          />
          <button
            type="button"
            disabled={!text}
            onClick={() => preview(text, speaker, pace).catch((e: Error) => setError(e.message))}
            className="shrink-0 rounded-lg bg-calm/10 px-3 text-calm disabled:opacity-40"
            title="Play with this patient's voice settings"
          >
            ▶
          </button>
        </span>
      </label>
    );
  };

  return (
    <div className="grid gap-3 rounded-xl bg-white/60 p-4 md:grid-cols-2">
      <label className="flex flex-col gap-1 text-xs text-muted">
        Target word (Devanagari)
        <input
          value={f.target_deva}
          onChange={(e) => update("target_deva", e.target.value)}
          className="rounded-lg border border-accent-soft bg-white px-2 py-1.5 text-xl text-foreground"
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-xs text-muted">
          Set
          <select
            value={f.set}
            onChange={(e) => update("set", e.target.value)}
            className="rounded-lg border border-accent-soft bg-white px-2 py-1.5 text-sm text-foreground"
          >
            {Object.entries(SET_LABEL).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Also accept (comma separated)
          <input
            value={f.accepted}
            onChange={(e) => update("accepted", e.target.value)}
            placeholder="kap, cup, प्याला"
            className="rounded-lg border border-accent-soft bg-white px-2 py-1.5 text-sm text-foreground"
          />
        </label>
      </div>
      {cue("prompt_text", "1. Prompt (description or sentence to complete)", "सुबह हम चाय किसमें पीते हैं?")}
      {cue("semantic_cue_text", "2. Meaning cue", "यह रसोई में होता है।")}
      {cue("phonemic_cue_text", "3. First-sound cue", "")}
      {cue("model_text", "4. Model (patient repeats)", "")}
      <div className="flex flex-wrap items-center gap-3 md:col-span-2">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={approve} onChange={(e) => setApprove(e.target.checked)} className="h-4 w-4" />
          I approve this wording for my patient
        </label>
        <button onClick={submit} disabled={pending} className="ml-auto rounded-full bg-accent px-4 py-2 text-sm text-white disabled:opacity-50">
          {pending ? "Saving…" : word ? "Save" : "Add word"}
        </button>
        {word && (
          <button
            onClick={() => {
              if (confirm(`Delete ${word.target_deva}? Past attempts stay but lose the link to this word.`)) {
                start(() => deleteWord(patientId, word.id));
              }
            }}
            className="rounded-full px-3 py-2 text-sm text-alert underline"
          >
            Delete
          </button>
        )}
        {error && <p className="w-full text-sm text-alert">{error}</p>}
      </div>
    </div>
  );
}

export default function WordEditor({
  patientId,
  words,
  speaker,
  pace,
}: {
  patientId: string;
  words: WordRow[];
  speaker?: string;
  pace?: number;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const groups: WordInput["set"][] = ["treated", "untreated", "reserve", "warmup"];
  const unapproved = words.filter((w) => !w.approved_at).length;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span>
          {words.filter((w) => w.set === "treated").length} treated · {words.filter((w) => w.set === "untreated").length} untreated
        </span>
        {unapproved > 0 && <span className="rounded-full bg-accent-soft px-3 py-1 text-accent">{unapproved} waiting for approval</span>}
        <button onClick={() => setAdding((a) => !a)} className="ml-auto rounded-full bg-calm px-4 py-2 text-white">
          {adding ? "Close" : "+ Add word"}
        </button>
      </div>
      {adding && <WordForm patientId={patientId} speaker={speaker} pace={pace} onDone={() => setAdding(false)} />}
      {groups.map((g) => {
        const list = words.filter((w) => w.set === g);
        if (list.length === 0) return null;
        return (
          <section key={g} className="rounded-2xl bg-surface p-4 shadow-sm">
            <h2 className="mb-2 font-semibold">{SET_LABEL[g]}</h2>
            <ul className="flex flex-col divide-y divide-accent-soft">
              {list.map((w) => (
                <li key={w.id} className="py-2">
                  <button onClick={() => setOpen(open === w.id ? null : w.id)} className="flex w-full items-center gap-3 text-left">
                    <span className="w-28 text-xl">{w.target_deva}</span>
                    <span className="flex-1 truncate text-sm text-muted">{w.prompt_text ?? "— no prompt —"}</span>
                    {w.approved_at ? (
                      <span className="rounded-full bg-calm/15 px-2 py-0.5 text-xs text-calm">approved</span>
                    ) : (
                      <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs text-accent">not approved</span>
                    )}
                  </button>
                  {open === w.id && (
                    <div className="mt-2">
                      <WordForm patientId={patientId} word={w} speaker={speaker} pace={pace} onDone={() => setOpen(null)} />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
