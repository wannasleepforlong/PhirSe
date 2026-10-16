import Link from "next/link";
import { L, pick } from "@/lib/i18n/dict";
import { uiMode } from "@/lib/i18n/server";
import { toHinglish } from "@/lib/i18n/hinglish";
import UiModeToggle from "@/components/UiModeToggle";

// One real item from the demo list, shown as the cue ladder a patient hears.
const LADDER = [
  { step: { native: "Prompt", hinglish: "Sawaal" }, voice: "सुबह हम चाय किसमें पीते हैं?", reply: "… (८ सेकंड चुप)", replyH: "… (8 second chup)" },
  { step: { native: "Meaning hint", hinglish: "Matlab ka hint" }, voice: "यह रसोई में होता है, इसे हैंडल से पकड़ते हैं।", reply: "प्याली?", replyH: "Pyaali?" },
  { step: { native: "First sound", hinglish: "Pehli awaaz" }, voice: "यह क… से शुरू होता है।", reply: "क… कप!", replyH: "K… kap!" },
];

export default async function Home() {
  const mode = await uiMode();
  const t = (k: keyof typeof L) => pick(L[k], mode);
  const say = (s: string) => (mode === "hinglish" ? toHinglish(s) : s);

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-5 sm:px-8">
        <span className="text-lg font-semibold text-neel">PhirSe</span>
        <div className="ml-auto flex items-center gap-4">
          <UiModeToggle mode={mode} nativeLabel="English" />
          <Link href="/slp/login" className="text-sm font-medium text-neel underline-offset-4 hover:underline">
            {t("slpSignIn")}
          </Link>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-12 px-4 pb-16 pt-6 sm:px-8 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-16 lg:pt-12">
        <section className="flex flex-col gap-6">
          <h1 className="font-display text-[5.5rem] leading-[0.95] text-neel sm:text-[8rem]">{t("headline")}</h1>
          <p className="max-w-[34ch] text-2xl leading-snug text-ink">{t("sub")}</p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link href="/slp/login" className="rounded-full bg-neel px-6 py-3 text-lg font-medium text-khadi">
              {t("trySession")}
            </Link>
          </div>
        </section>

        <section aria-labelledby="ladder" className="rounded-[2rem] bg-neel p-6 text-khadi sm:p-9">
          <h2 id="ladder" className="text-lg text-khadi/70">{t("ladderTitle")}</h2>
          <ol className="mt-6 flex flex-col">
            {LADDER.map((s, i) => (
              <li key={i} className="grid grid-cols-[2rem_1fr] gap-x-4 pb-6">
                <span className="wide flex h-8 w-8 items-center justify-center rounded-full border border-khadi/40 text-sm">{i + 1}</span>
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm text-haldi">{s.step[mode]}</span>
                  <p className="text-xl leading-snug">“{say(s.voice)}”</p>
                  <p className="text-lg text-khadi/60">{mode === "hinglish" ? s.replyH : s.reply}</p>
                </div>
              </li>
            ))}
            <li className="grid grid-cols-[2rem_1fr] items-center gap-x-4">
              <span className="h-8 w-8 rounded-full bg-mehendi ring-4 ring-mehendi/30" aria-hidden />
              <p className="font-display text-7xl leading-none">{mode === "hinglish" ? "Kap" : "कप"}</p>
            </li>
          </ol>
        </section>
      </main>

      <section className="border-t border-line">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-8 md:grid-cols-3">
          {([
            ["patienceTitle", "patienceBody", "bg-haldi"],
            ["honestTitle", "honestBody", "bg-neel"],
            ["safeTitle", "safeBody", "bg-sindoor"],
          ] as const).map(([title, body, mark]) => (
            <div key={title} className="flex flex-col gap-3">
              <span className={`h-1 w-12 rounded-full ${mark}`} aria-hidden />
              <h3 className="text-2xl font-semibold text-neel">{t(title)}</h3>
              <p className="max-w-[42ch] text-lg leading-relaxed text-ink/80">{t(body)}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-4 pb-10 text-base text-ink/70 sm:px-8">{t("footer")}</footer>
    </div>
  );
}
