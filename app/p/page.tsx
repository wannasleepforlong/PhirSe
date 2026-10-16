import { P, pick } from "@/lib/i18n/dict";
import { uiMode } from "@/lib/i18n/server";

export const metadata = { title: "PhirSe" };

// Patients have no password: each one opens the private link their therapist shares.
export default async function PatientIndex() {
  const mode = await uiMode();
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-neel px-6 text-center text-khadi">
      <h1 className="font-display text-5xl">{pick(P.brand, "native")}</h1>
      <p className="max-w-md text-2xl leading-snug">
        {mode === "hinglish"
          ? "Practice shuru karne ke liye apni therapist ka bheja hua link kholiye."
          : "अभ्यास शुरू करने के लिए अपनी थेरेपिस्ट का भेजा हुआ लिंक खोलें।"}
      </p>
    </main>
  );
}
