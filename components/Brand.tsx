import Link from "next/link";

/**
 * Wordmark: a turmeric bindu beside फिर से, with the Latin name underneath.
 * Pass href={null} where a stray tap must not leave the page (the patient screen).
 */
export default function Brand({ tone = "light", href = "/" }: { tone?: "light" | "dark"; href?: string | null }) {
  const dark = tone === "dark";
  const body = (
    <>
      <span className="relative flex h-8 w-8 items-center justify-center" aria-hidden>
        <span className={`absolute inset-0 rounded-full ${dark ? "bg-khadi/15" : "bg-haldi/30"}`} />
        <span className="h-4 w-4 rounded-full bg-haldi" />
      </span>
      <span className="flex flex-col leading-none">
        <span className={`font-display text-2xl ${dark ? "text-khadi" : "text-neel"}`}>फिर से</span>
        <span className={`text-[0.7rem] tracking-wide ${dark ? "text-khadi/60" : "text-ink/55"}`}>PhirSe</span>
      </span>
    </>
  );
  return href ? (
    <Link href={href} className="inline-flex items-center gap-2.5" aria-label="PhirSe home">
      {body}
    </Link>
  ) : (
    <span className="inline-flex items-center gap-2.5">{body}</span>
  );
}
