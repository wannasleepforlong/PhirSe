"use client";

import { useState, useTransition } from "react";
import { F, pick, type UiMode } from "@/lib/i18n/dict";
import { firstAkshara } from "@/lib/session/scripts";
import type { WordRow } from "@/lib/profile/dashboard";
import { previewLine, removeWord, saveWord, type WordInput } from "../actions";

type EditableSet = WordInput["set"];
type CueField = "prompt_text" | "semantic_cue_text" | "phonemic_cue_text" | "model_text";

const field = "w-full rounded-xl border border-line bg-white px-3 py-2.5 text-lg text-ink placeholder:text-ink/35";

function WordForm({
  token,
  mode,
  word,
  onDone,
}: {
  token: string;
  mode: UiMode;
  word?: WordRow;
  onDone?: () => void;
}) {
  const t = (k: keyof typeof F) => pick(F[k], mode);
  const [f, setF] = useState({
    target_deva: word?.target_deva ?? "",
    set: (word?.set === "untreated" || word?.set === "reserve" ? word.set : "treated") as EditableSet,
    accepted: (word?.accepted_forms ?? []).join(", "),
    prompt_text: word?.prompt_text ?? "",
    semantic_cue_text: word?.semantic_cue_text ?? "",
    phonemic_cue_text: word?.phonemic_cue_text ?? "",
    model_text: word?.model_text ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const target = f.target_deva.trim();
  const defaults: Record<CueField, string> = {
    prompt_text: "इसका नाम बताइए।",
    semantic_cue_text: "थोड़ा सोचिए, आप इसे रोज़ देखते हैं।",
    phonemic_cue_text: target ? `यह ${firstAkshara(target)}… से शुरू होता है।` : "",
    model_text: target ? `${target}। अब आप बोलिए: ${target}।` : "",
  };

  const play = (text: string) =>
    start(async () => {
      const res = await previewLine(token, text);
      if (res.url) await new Audio(res.url).play().catch(() => setError("Tap play again to hear it."));
      else setError(res.error ?? null);
    });

  const cue = (k: CueField, label: string, showFor: EditableSet[] = ["treated", "reserve"]) => {
    if (!showFor.includes(f.set)) return null;
    const text = f[k] || defaults[k];
    return (
      <label className="flex flex-col gap-1.5 text-sm text-ink/70">
        {label}
        <span className="flex gap-2">
          <input value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} placeholder={defaults[k]} className={field} />
          <button
            type="button"
            disabled={!text || pending}
            onClick={() => play(text)}
            aria-label={`${t("play")}: ${text}`}
            className="shrink-0 rounded-xl border border-line px-3 text-neel disabled:opacity-40"
          >
            ▶
          </button>
        </span>
      </label>
    );
  };

  const save = () =>
    start(async () => {
      setError(null);
      const res = await saveWord(token, {
        id: word?.id,
        target_deva: f.target_deva,
        set: f.set,
        accepted_forms: f.accepted.split(","),
        prompt_text: f.prompt_text,
        semantic_cue_text: f.semantic_cue_text,
        phonemic_cue_text: f.phonemic_cue_text,
        model_text: f.model_text,
      });
      if (res.error) setError(res.error);
      else onDone?.();
    });

  return (
    <div className="grid gap-4 rounded-2xl bg-white p-5 ring-1 ring-line md:grid-cols-2">
      <label className="flex flex-col gap-1.5 text-sm text-ink/70">
        {t("wordLabel")}
        <input value={f.target_deva} onChange={(e) => setF({ ...f, target_deva: e.target.value })} placeholder="कप" className={`${field} text-2xl`} />
      </label>
      <fieldset className="flex flex-col gap-1.5 text-sm text-ink/70">
        <legend className="mb-1.5">{t("setLabel")}</legend>
        <div className="flex flex-wrap gap-2">
          {([
            ["treated", "setPractise"],
            ["untreated", "setCheck"],
            ["reserve", "setRest"],
          ] as [EditableSet, keyof typeof F][]).map(([v, label]) => (
            <button
              key={v}
              type="button"
              aria-pressed={f.set === v}
              onClick={() => setF({ ...f, set: v })}
              className={`rounded-full px-3.5 py-2 text-base ${f.set === v ? "bg-neel text-khadi" : "border border-line text-ink"}`}
            >
              {t(label)}
            </button>
          ))}
        </div>
      </fieldset>
      {cue("prompt_text", t("promptLabel"), ["treated", "untreated", "reserve"])}
      <label className="flex flex-col gap-1.5 text-sm text-ink/70">
        {t("alsoLabel")}
        <input value={f.accepted} onChange={(e) => setF({ ...f, accepted: e.target.value })} placeholder="kap, cup, प्याला" className={field} />
      </label>
      {cue("semantic_cue_text", t("meaningLabel"))}
      {cue("phonemic_cue_text", t("soundLabel"))}
      {cue("model_text", t("modelLabel"))}
      <div className="flex flex-wrap items-center gap-3 md:col-span-2">
        {error && <p role="alert" className="w-full text-sindoor">{error}</p>}
        <button onClick={save} disabled={pending} className="rounded-full bg-neel px-6 py-2.5 font-medium text-khadi disabled:opacity-60">
          {pending ? t("saving") : t("save")}
        </button>
        {word && (
          <button
            onClick={() => start(() => removeWord(token, word.id))}
            disabled={pending}
            className="rounded-full px-4 py-2.5 text-sindoor underline-offset-4 hover:underline"
          >
            {t("remove")}
          </button>
        )}
      </div>
    </div>
  );
}

export default function WordEditor({ token, mode, words }: { token: string; mode: UiMode; words: WordRow[] }) {
  const t = (k: keyof typeof F) => pick(F[k], mode);
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const groups: [EditableSet, keyof typeof F][] = [
    ["treated", "setPractise"],
    ["untreated", "setCheck"],
    ["reserve", "setRest"],
  ];

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-4">
        <button onClick={() => setAdding((a) => !a)} className="self-start rounded-full bg-haldi px-5 py-2.5 font-medium text-neel-deep">
          + {t("addWord")}
        </button>
        {adding && <WordForm token={token} mode={mode} onDone={() => setAdding(false)} />}
      </div>
      {groups.map(([set, label]) => {
        const list = words.filter((w) => w.set === set);
        if (list.length === 0) return null;
        return (
          <section key={set} className="flex flex-col gap-3">
            <h2 className="text-xl font-semibold text-neel">
              {t(label)} <span className="font-normal text-ink/45">{list.length}</span>
            </h2>
            <ul className="flex flex-col divide-y divide-line border-y border-line">
              {list.map((w) => (
                <li key={w.id} className="py-2">
                  <button
                    onClick={() => setOpen(open === w.id ? null : w.id)}
                    aria-expanded={open === w.id}
                    className="flex w-full items-baseline gap-4 py-1 text-left"
                  >
                    <span className="w-28 shrink-0 text-2xl">{w.target_deva}</span>
                    <span className="truncate text-ink/60">{w.prompt_text ?? "—"}</span>
                  </button>
                  {open === w.id && (
                    <div className="mt-3">
                      <WordForm token={token} mode={mode} word={w} onDone={() => setOpen(null)} />
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
