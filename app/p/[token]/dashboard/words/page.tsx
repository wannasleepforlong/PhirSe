import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DashShell from "@/components/dashboard/DashShell";
import { F, pick } from "@/lib/i18n/dict";
import { uiMode } from "@/lib/i18n/server";
import { loadWords } from "@/lib/profile/dashboard";
import { isReadOnly, profileFromToken, ProfileError } from "@/lib/profile/service";
import WordEditor from "./WordEditor";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Words · PhirSe", robots: { index: false }, referrer: "no-referrer" };

export default async function WordsPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const profile = await profileFromToken(token).catch((e) => {
    if (e instanceof ProfileError && e.status === 401) notFound();
    throw e;
  });
  const mode = await uiMode();
  const readOnly = isReadOnly(profile);
  const words = (await loadWords(profile.id)).filter((w) => w.set !== "warmup");
  return (
    <DashShell token={token} name={`${profile.display_name} ${profile.honorific}`.trim()} mode={mode} tab="words" readOnly={readOnly}>
      <p className="max-w-[70ch] text-lg text-ink/75">{pick(F.wordsEditHint, mode)}</p>
      <WordEditor token={token} mode={mode} words={words} readOnly={readOnly} />
    </DashShell>
  );
}
