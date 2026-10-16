import Link from "next/link";
import { L, P, pick } from "@/lib/i18n/dict";
import { uiMode } from "@/lib/i18n/server";

export const metadata = { title: "PhirSe" };

// No passwords: each practice has its own private link.
export default async function PatientIndex() {
  const mode = await uiMode();
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-neel px-6 text-center text-khadi">
      <h1 className="font-display text-5xl">{pick(P.brand, "native")}</h1>
      <p className="max-w-md text-2xl leading-snug">
        {mode === "hinglish"
          ? "Apna practice link kholiye, ya nayi practice banaiye."
          : "अपना अभ्यास लिंक खोलें, या नया अभ्यास बनाएँ।"}
      </p>
      <Link href="/start" className="rounded-full bg-haldi px-6 py-3 text-lg font-medium text-neel-deep">
        {pick(L.begin, mode)}
      </Link>
    </main>
  );
}
