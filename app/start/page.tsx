import type { Metadata } from "next";
import { uiMode } from "@/lib/i18n/server";
import UiModeToggle from "@/components/UiModeToggle";
import Brand from "@/components/Brand";
import StartForm from "./StartForm";

export const metadata: Metadata = { title: "Start practice · PhirSe" };

export default async function StartPage() {
  const mode = await uiMode();
  return (
    <div className="min-h-dvh bg-[linear-gradient(to_bottom,var(--neel-soft)_0,var(--khadi)_22rem)]">
      <header className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-5 sm:px-8">
        <Brand />
        <div className="ml-auto">
          <UiModeToggle mode={mode} nativeLabel="English" />
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 pb-16 sm:px-8">
        <div className="panel px-5 pb-8 pt-4 sm:px-10 sm:pb-10 sm:pt-6">
          <StartForm mode={mode} />
        </div>
      </main>
    </div>
  );
}
