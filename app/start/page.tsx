import type { Metadata } from "next";
import Link from "next/link";
import { uiMode } from "@/lib/i18n/server";
import UiModeToggle from "@/components/UiModeToggle";
import StartForm from "./StartForm";

export const metadata: Metadata = { title: "Start practice · PhirSe" };

export default async function StartPage() {
  const mode = await uiMode();
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-5 sm:px-8">
        <Link href="/" className="font-display text-2xl text-neel">फिर से</Link>
        <div className="ml-auto">
          <UiModeToggle mode={mode} nativeLabel="English" />
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 pb-16 sm:px-8">
        <StartForm mode={mode} />
      </main>
    </div>
  );
}
