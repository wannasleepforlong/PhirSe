import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import DashShell, { fmtDate } from "@/components/dashboard/DashShell";
import { F, pick } from "@/lib/i18n/dict";
import { uiMode } from "@/lib/i18n/server";
import { loadSessionReview } from "@/lib/profile/dashboard";
import { profileFromToken, ProfileError } from "@/lib/profile/service";
import MarkAnswer from "./MarkAnswer";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Session · PhirSe", robots: { index: false }, referrer: "no-referrer" };

const CUE_LABEL: Record<string, { native: string; hinglish: string }> = {
  prompt: { native: "question", hinglish: "sawaal" },
  semantic: { native: "meaning hint", hinglish: "matlab hint" },
  phonemic: { native: "first sound", hinglish: "pehli awaaz" },
  model: { native: "repeat after the voice", hinglish: "awaaz ke baad dohraana" },
};

const SCORE: Record<string, { key: keyof typeof F; style: string }> = {
  correct: { key: "scoreCorrect", style: "bg-mehendi-soft text-mehendi" },
  uncertain: { key: "scoreUncertain", style: "bg-haldi-soft text-ink" },
  not_yet: { key: "scoreNotYet", style: "bg-neel-soft text-neel" },
};

export default async function SessionPage({ params }: { params: Promise<{ token: string; id: string }> }) {
  const { token, id } = await params;
  const profile = await profileFromToken(token).catch((e) => {
    if (e instanceof ProfileError && e.status === 401) notFound();
    throw e;
  });
  const review = await loadSessionReview(profile.id, id);
  if (!review) notFound();
  const mode = await uiMode();
  const t = (k: keyof typeof F) => pick(F[k], mode);
  const answers = review.attempts.filter((a) => a.phase !== "warmup" && a.word);

  return (
    <DashShell token={token} name={`${profile.display_name} ${profile.honorific}`.trim()} mode={mode} tab={null}>
      <div className="flex flex-col gap-2">
        <Link href={`/p/${token}/dashboard`} className="text-neel underline-offset-4 hover:underline">← {t("overview")}</Link>
        <h2 className="text-3xl font-semibold text-neel">
          {t("sessionTitle")}, {fmtDate(review.session.started_at)}
        </h2>
        <p className="text-ink/65">
          {review.session.minutes_active ? `${review.session.minutes_active.toFixed(1)} min` : ""}
          {review.session.end_reason ? `, ${review.session.end_reason}` : ""}
        </p>
        <p className="max-w-[70ch] text-ink/65">{t("checkHint")}</p>
      </div>

      <ol className="flex flex-col divide-y divide-line border-y border-line">
        {answers.map((a) => {
          const score = SCORE[a.live_score];
          return (
            <li key={a.id} className="grid gap-4 py-5 md:grid-cols-[10rem_1fr_auto] md:items-start">
              <div className="flex flex-col gap-1">
                <span className="text-3xl">{a.word!.target_deva}</span>
                <span className="text-sm text-ink/60">
                  {a.phase === "probe" ? "check" : CUE_LABEL[a.cue_level ?? "prompt"]?.[mode]}
                  {a.latency_ms !== null ? `, ${(a.latency_ms / 1000).toFixed(1)} s` : ""}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {a.audioUrl && <audio controls preload="none" src={a.audioUrl} className="h-10 w-full max-w-sm" />}
                <p>
                  <span className="text-ink/60">{t("heardAs")}: </span>
                  <span className="text-lg">{a.transcript_a || "—"}</span>
                </p>
                {a.transcript_b && a.transcript_b.replace(/[।.]/g, "") !== (a.transcript_a ?? "").replace(/[।.]/g, "") && (
                  <p>
                    <span className="text-ink/60">{t("heardBiased")}: </span>
                    <span className="text-lg">{a.transcript_b}</span>
                  </p>
                )}
                <span className={`self-start rounded-full px-3 py-1 text-sm ${score.style}`}>{t(score.key)}</span>
                {a.clarity ? (
                  <div className="flex flex-col gap-2 pt-1">
                    <p className="flex flex-wrap items-baseline gap-x-3">
                      <span className="text-ink/60">{t("clarity")}</span>
                      <span className="wide text-2xl font-semibold text-neel">{a.clarity.clarity}</span>
                      {a.clarity.heard && (
                        <span className="text-ink/60">
                          {t("modelHeard")}: <span className="text-lg text-ink">{a.clarity.heard}</span>
                        </span>
                      )}
                    </p>
                    {a.clarity.sounds.length > 0 && (
                      <div className="flex flex-wrap gap-1.5" aria-label={t("clarity")}>
                        {a.clarity.sounds.map((snd, i) => (
                          <span
                            key={i}
                            title={`${Math.round(snd.score * 100)}%`}
                            className={`rounded-lg px-2.5 py-1 text-xl ${
                              snd.score >= 0.7 ? "bg-mehendi-soft text-mehendi" : snd.score >= 0.4 ? "bg-haldi-soft" : "bg-sindoor/10 text-sindoor"
                            }`}
                          >
                            {snd.unit}
                          </span>
                        ))}
                      </div>
                    )}
                    {a.clarity.weakest && (
                      <p className="text-sm text-ink/70">
                        {t("weakSound")}: <span className="text-lg">{a.clarity.weakest}</span>
                      </p>
                    )}
                    {a.clarity.flags.includes("other_speaker") && <p className="text-sm text-sindoor">{t("otherSpeaker")}</p>}
                  </div>
                ) : (
                  a.verifierStatus === "pending" && <p className="text-sm text-ink/50">{t("clarityWaiting")}</p>
                )}
              </div>
              <MarkAnswer token={token} attemptId={a.id} label={a.slp_label} mode={mode} />
            </li>
          );
        })}
      </ol>
    </DashShell>
  );
}
