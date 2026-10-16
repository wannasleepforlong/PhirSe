"use client";

import { useState } from "react";
import { useSessionRunner, type RunnerStatus } from "@/hooks/useSessionRunner";

const STATUS_TEXT: Record<RunnerStatus, string> = {
  idle: "",
  preparing: "तैयारी हो रही है…",
  speaking: "सुनिए…",
  listening: "आराम से सोचिए, मैं सुन रही हूँ",
  hearing: "सुन रही हूँ…",
  thinking: "एक पल…",
  asking: "हाँ या नहीं बोलिए, या बटन दबाइए",
  paused: "रुके हुए हैं",
  done: "",
  safety: "",
  error: "",
};

function Orb({ status }: { status: RunnerStatus }) {
  const active = status === "listening" || status === "hearing";
  return (
    <div className="relative flex h-44 w-44 items-center justify-center" aria-hidden>
      <span
        className={`absolute inset-0 rounded-full bg-calm/20 ${active ? "animate-ping [animation-duration:2.5s]" : ""}`}
      />
      <span
        className={`relative h-32 w-32 rounded-full shadow-lg transition-colors duration-500 ${
          status === "hearing" ? "bg-calm" : status === "speaking" ? "bg-accent" : "bg-calm/70"
        }`}
      />
    </div>
  );
}

export default function PatientSession({ token }: { token: string }) {
  const r = useSessionRunner(token);
  const [captions, setCaptions] = useState(true);
  const inSession = !["idle", "done", "safety", "error"].includes(r.status);

  if (r.status === "safety") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-alert px-4 text-center text-white">
        <p className="text-4xl font-bold leading-snug">अभ्यास रोक दिया गया है</p>
        <p className="text-2xl">नई परेशानी है तो अभी कॉल करें। लक्षण शुरू होने का समय नोट करें।</p>
        <div className="flex w-full max-w-sm flex-col gap-4">
          <a href="tel:112" className="rounded-2xl bg-white py-5 text-3xl font-bold text-alert">112 पर कॉल करें</a>
          <a href="tel:108" className="rounded-2xl bg-white/90 py-5 text-3xl font-bold text-alert">108 एम्बुलेंस</a>
        </div>
        <p className="text-lg">परिवार और थेरेपिस्ट को सूचना भेजी जा रही है।</p>
      </main>
    );
  }

  if (r.status === "done") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
        <p className="text-6xl">🌼</p>
        <p className="text-4xl font-bold">आज का अभ्यास पूरा!</p>
        <p className="text-2xl text-muted">शाबाश। कल फिर मिलते हैं।</p>
      </main>
    );
  }

  if (r.status === "idle" || r.status === "error") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-between gap-8 px-4 py-12 text-center">
        <div className="flex flex-col gap-3">
          <p className="text-lg font-medium text-calm">फिर से</p>
          <p className="text-4xl font-bold leading-snug">नमस्ते! आज का अभ्यास तैयार है।</p>
          <p className="text-xl text-muted">यह एक कंप्यूटर की आवाज़ है, इंसान नहीं।</p>
        </div>
        {r.status === "error" && (
          <div className="max-w-md rounded-2xl bg-alert/10 px-5 py-4 text-lg text-alert">
            {r.error === "mic" ? (
              <>माइक की अनुमति चाहिए। ब्राउज़र में ऊपर ताले 🔒 पर दबाएँ और माइक्रोफ़ोन को “Allow” करें।</>
            ) : (
              <>कुछ गड़बड़ हुई। फिर से कोशिश करें। ({r.error})</>
            )}
          </div>
        )}
        <button
          onClick={r.start}
          className="h-56 w-56 rounded-full bg-accent text-5xl font-bold text-white shadow-xl active:scale-95"
        >
          शुरू करें
        </button>
        <p className="max-w-md text-base text-muted">
          शांत कमरे में बैठें। परिवार का कोई सदस्य पास रहे। यह आपातकालीन सेवा नहीं है — नए स्ट्रोक लक्षणों पर 112 या 108 पर कॉल करें।
        </p>
      </main>
    );
  }

  const a = r.action;
  return (
    <main className="flex min-h-screen flex-col items-center justify-between gap-6 px-4 py-6 text-center">
      <div className="flex w-full max-w-xl items-center justify-between">
        <button
          onClick={() => setCaptions((c) => !c)}
          className="rounded-full bg-surface px-4 py-2 text-base text-muted shadow-sm"
        >
          {captions ? "लिखा हुआ छिपाएँ" : "लिखा हुआ दिखाएँ"}
        </button>
        <button
          onClick={r.help}
          className="rounded-full border-2 border-alert bg-white px-6 py-3 text-2xl font-bold text-alert shadow-sm"
        >
          मदद
        </button>
      </div>

      {a && a.progress.total > 0 && (
        <div className="flex gap-1.5" aria-label={`${a.progress.done} of ${a.progress.total}`}>
          {Array.from({ length: a.progress.total }, (_, i) => (
            <span key={i} className={`h-2.5 w-2.5 rounded-full ${i < a.progress.done ? "bg-calm" : "bg-accent-soft"}`} />
          ))}
        </div>
      )}

      <div className="flex flex-1 flex-col items-center justify-center gap-6">
        {a?.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={a.imageUrl} alt="" className="max-h-56 rounded-3xl object-contain shadow" />
        )}
        <Orb status={r.status} />
        <p className="min-h-8 text-2xl text-muted" aria-live="polite">
          {STATUS_TEXT[r.status]}
        </p>
        {captions && r.caption && <p className="max-w-xl text-3xl font-medium leading-snug">{r.caption}</p>}
      </div>

      {r.status === "asking" ? (
        <div className="flex w-full max-w-md gap-4">
          <button onClick={() => r.answer(true)} className="flex-1 rounded-3xl bg-calm py-8 text-4xl font-bold text-white shadow-lg">
            हाँ
          </button>
          <button onClick={() => r.answer(false)} className="flex-1 rounded-3xl bg-white py-8 text-4xl font-bold text-foreground shadow-lg">
            नहीं
          </button>
        </div>
      ) : r.status === "paused" ? (
        <div className="flex w-full max-w-md flex-col gap-3">
          <button onClick={r.resume} className="rounded-3xl bg-calm py-8 text-4xl font-bold text-white shadow-lg">
            चलिए
          </button>
          <button onClick={r.stop} className="rounded-3xl bg-white py-4 text-2xl text-muted shadow">
            आज के लिए बस
          </button>
        </div>
      ) : (
        <div className="flex w-full max-w-md gap-4">
          <button
            onClick={r.pause}
            disabled={!inSession || r.status === "preparing"}
            className="flex-1 rounded-3xl bg-white py-6 text-3xl text-foreground shadow disabled:opacity-40"
          >
            रुकिए
          </button>
          <button
            onClick={r.skip}
            disabled={!a?.itemId || r.status === "thinking"}
            className="flex-1 rounded-3xl bg-white py-6 text-3xl text-foreground shadow disabled:opacity-40"
          >
            अगला
          </button>
        </div>
      )}
    </main>
  );
}
