"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { F, pick, type UiMode } from "@/lib/i18n/dict";
import { startPractice } from "./actions";

const HONORIFICS = ["जी", "साहब", "माँ", ""];
const RELATIONS: { value: string; native: string; hinglish: string }[] = [
  { value: "self", native: "Myself", hinglish: "Main khud" },
  { value: "child", native: "Son or daughter", hinglish: "Beta ya beti" },
  { value: "spouse", native: "Husband or wife", hinglish: "Pati ya patni" },
  { value: "carer", native: "Carer", hinglish: "Dekhbhaal karne wale" },
  { value: "other", native: "Someone else", hinglish: "Koi aur" },
];

const input = "w-full rounded-xl border border-line bg-khadi/60 px-4 py-3 text-lg text-ink placeholder:text-ink/40 transition-colors focus:border-neel focus:bg-paper focus:outline-none";
const chipOn = "bg-neel text-khadi shadow-[var(--lift)]";
const chipOff = "border border-line bg-paper text-ink hover:border-neel/40";

export default function StartForm({ mode }: { mode: UiMode }) {
  const t = (k: keyof typeof F) => pick(F[k], mode);
  const [name, setName] = useState("");
  const [honorific, setHonorific] = useState("जी");
  const [relation, setRelation] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [storeAudio, setStoreAudio] = useState(true);
  const [ack, setAck] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  if (token) {
    const link = `${window.location.origin}/p/${token}`;
    const wa = `https://wa.me/?text=${encodeURIComponent(`PhirSe practice link: ${link}`)}`;
    return (
      <section className="flex flex-col gap-6 pt-6">
        <span className="h-14 w-14 rounded-full bg-mehendi ring-[10px] ring-mehendi/20" aria-hidden />
        <h1 className="font-display text-5xl leading-tight text-neel">{t("readyTitle")}</h1>
        <p className="max-w-[60ch] text-lg leading-relaxed text-ink/80">{t("saveLink")}</p>
        <code className="break-all rounded-xl border border-dashed border-neel/30 bg-neel-soft px-4 py-3 text-base text-neel">{link}</code>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => navigator.clipboard.writeText(link).then(() => setCopied(true))}
            className="rounded-full border border-neel/30 px-5 py-2.5 text-neel hover:bg-neel-soft"
          >
            {copied ? t("copied") : t("copy")}
          </button>
          <a href={wa} target="_blank" rel="noreferrer" className="rounded-full border border-neel/30 px-5 py-2.5 text-neel hover:bg-neel-soft">
            {t("whatsapp")}
          </a>
        </div>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link href={`/p/${token}`} className="rounded-full bg-haldi px-7 py-3.5 text-lg font-semibold text-neel-deep shadow-[var(--lift)]">
            {t("startPractice")}
          </Link>
        </div>
      </section>
    );
  }

  return (
    <form
      className="flex flex-col gap-8 pt-6"
      onSubmit={(ev) => {
        ev.preventDefault();
        start(async () => {
          setError(null);
          const res = await startPractice({
            displayName: name,
            honorific,
            relation,
            familyPhone: phone.trim() || null,
            storeAudio,
            acknowledged: ack,
          });
          if (res.ok) setToken(res.token);
          else setError(res.error);
        });
      }}
    >
      <div className="flex flex-col gap-3">
        <h1 className="font-display text-5xl leading-tight text-neel">{t("startTitle")}</h1>
        <p className="max-w-[60ch] text-lg leading-relaxed text-ink/80">{t("startBody")}</p>
      </div>

      <fieldset className="flex flex-col gap-3">
        <label htmlFor="name" className="text-lg font-medium">{t("nameLabel")}</label>
        <div className="flex flex-wrap gap-3">
          <input id="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder={t("namePlaceholder")} className={`${input} max-w-sm`} />
          <div role="radiogroup" aria-label={t("honorificLabel")} className="flex flex-wrap gap-2">
            {HONORIFICS.map((h) => (
              <button
                type="button"
                key={h || "none"}
                role="radio"
                aria-checked={honorific === h}
                onClick={() => setHonorific(h)}
                className={`rounded-full px-4 py-3 text-lg ${honorific === h ? chipOn : chipOff}`}
              >
                {h || "—"}
              </button>
            ))}
          </div>
        </div>
        {name.trim() && (
          <p className="self-start rounded-2xl rounded-tl-sm bg-neel-soft px-4 py-2 text-lg text-neel">
            “नमस्ते {name.trim()} {honorific}!”
          </p>
        )}
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-lg font-medium">{t("relationLabel")}</legend>
        <div className="flex flex-wrap gap-2">
          {RELATIONS.map((r) => (
            <button
              type="button"
              key={r.value}
              aria-pressed={relation === r.value}
              onClick={() => setRelation(r.value)}
              className={`rounded-full px-4 py-2.5 ${relation === r.value ? chipOn : chipOff}`}
            >
              {r[mode]}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-2">
        <label htmlFor="phone" className="text-lg font-medium">{t("phoneLabel")}</label>
        <input id="phone" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={`${input} max-w-xs`} />
        <p className="text-sm text-ink/60">{t("phoneHint")}</p>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl bg-khadi p-5">
        <label className="flex items-start gap-3 text-base">
          <input type="checkbox" checked={storeAudio} onChange={(e) => setStoreAudio(e.target.checked)} className="mt-1 h-5 w-5 accent-[var(--neel)]" />
          {t("keepAudio")}
        </label>
        <label className="flex items-start gap-3 text-base">
          <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-1 h-5 w-5 accent-[var(--neel)]" />
          {t("ack")}
        </label>
      </div>

      {error && <p role="alert" className="rounded-xl bg-sindoor/10 px-4 py-3 text-sindoor">{error}</p>}

      <button disabled={pending} className="self-start rounded-full bg-neel px-8 py-4 text-lg font-medium text-khadi shadow-[var(--lift)] transition-colors hover:bg-neel-deep disabled:opacity-60">
        {pending ? t("creating") : t("create")}
      </button>
    </form>
  );
}
