"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { encodeWav, durationMs } from "@/lib/audio/wav";

type Intended = "correct" | "error" | "silence";

interface Row {
  id: number;
  target: string;
  intended: Intended;
  durationMs: number;
  transcriptA: string | null;
  transcriptB: string | null;
  msA: number | null;
  msB: number | null;
  totalMs: number;
  score: "correct" | "not_yet" | "uncertain";
  reason: string;
  safety: { category: string; phrase: string }[];
  errors: string[];
}

const DEFAULT_WORDS = `कप | kap | cup | प्याला
चाय | chai | tea
पानी | paani | water
दरवाज़ा | darwaza | door
चम्मच | chammach | spoon
रोटी | roti
किताब | kitaab | book
घड़ी | ghadi | watch | clock`;

const SPEAKERS = ["priya", "neha", "ritu", "pooja", "kavya", "shubh", "aditya", "rahul", "amit"];

function readLocal(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}
function writeLocal(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable */
  }
}

function parseWords(text: string): string[][] {
  return text
    .split("\n")
    .map((l) => l.split("|").map((s) => s.trim()).filter(Boolean))
    .filter((f) => f.length > 0);
}

export default function SpikeClient() {
  const [accessKey, setAccessKey] = useState("");
  const [wordsText, setWordsText] = useState(DEFAULT_WORDS);
  const [wordIndex, setWordIndex] = useState(0);
  const [intended, setIntended] = useState<Intended>("correct");
  const [endOfSpeechMs, setEndOfSpeechMs] = useState(1500);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ttsText, setTtsText] = useState("सुबह हम चाय किसमें पीते हैं?");
  const [ttsPace, setTtsPace] = useState(0.8);
  const [ttsSpeaker, setTtsSpeaker] = useState("priya");
  const [ttsMs, setTtsMs] = useState<number | null>(null);

  const vadRef = useRef<{ start: () => Promise<void>; pause: () => Promise<void>; destroy: () => Promise<void> } | null>(null);
  const stateRef = useRef({ words: [] as string[][], wordIndex: 0, intended: "correct" as Intended, accessKey: "" });

  const words = useMemo(() => parseWords(wordsText), [wordsText]);
  const current = words[Math.min(wordIndex, Math.max(0, words.length - 1))] ?? [];

  useEffect(() => {
    setAccessKey(readLocal("phirse.spike.key", ""));
    const saved = readLocal("phirse.spike.words", "");
    if (saved) setWordsText(saved);
  }, []);

  useEffect(() => {
    stateRef.current = { words, wordIndex, intended, accessKey };
  }, [words, wordIndex, intended, accessKey]);

  useEffect(() => () => void vadRef.current?.destroy(), []);

  async function sendAttempt(audio: Float32Array) {
    const { words: ws, wordIndex: wi, intended: it, accessKey: key } = stateRef.current;
    const forms = ws[wi] ?? [];
    if (forms.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("audio", new Blob([encodeWav(audio)], { type: "audio/wav" }), "attempt.wav");
      body.append("acceptedForms", JSON.stringify(forms));
      body.append("speechDetected", "true");
      body.append("key", key);
      const res = await fetch("/api/spike/score", { method: "POST", body });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? res.statusText);
      setRows((r) => [
        { id: Date.now(), target: forms[0], intended: it, durationMs: durationMs(audio), ...json },
        ...r,
      ]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleListening() {
    if (listening) {
      await vadRef.current?.pause();
      setListening(false);
      return;
    }
    setError(null);
    try {
      if (!vadRef.current) {
        const { MicVAD } = await import("@ricky0123/vad-web");
        vadRef.current = await MicVAD.new({
          model: "v5",
          baseAssetPath: "/vad/",
          onnxWASMBasePath: "/vad/",
          redemptionMs: endOfSpeechMs,
          minSpeechMs: 150,
          preSpeechPadMs: 300,
          getStream: () =>
            navigator.mediaDevices.getUserMedia({
              audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            }),
          onSpeechStart: () => setSpeaking(true),
          onVADMisfire: () => setSpeaking(false),
          onSpeechEnd: (audio: Float32Array) => {
            setSpeaking(false);
            void sendAttempt(audio);
          },
        });
      }
      await vadRef.current.start();
      setListening(true);
    } catch (e) {
      setError(`Mic/VAD error: ${(e as Error).message}`);
    }
  }

  async function playTts() {
    setError(null);
    setTtsMs(null);
    try {
      const res = await fetch("/api/spike/tts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ key: accessKey, text: ttsText, pace: ttsPace, speaker: ttsSpeaker }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? res.statusText);
      setTtsMs(Number(res.headers.get("x-tts-ms")));
      const url = URL.createObjectURL(await res.blob());
      const audio = new Audio(url);
      audio.onended = () => URL.revokeObjectURL(url);
      await audio.play();
    } catch (e) {
      setError(`TTS error: ${(e as Error).message}`);
    }
  }

  const stats = useMemo(() => {
    const correctIntended = rows.filter((r) => r.intended === "correct");
    const errorIntended = rows.filter((r) => r.intended === "error");
    const pct = (n: number, d: number) => (d === 0 ? "–" : `${Math.round((100 * n) / d)}%`);
    const lat = rows.map((r) => r.totalMs).sort((a, b) => a - b);
    return {
      n: rows.length,
      detection: pct(correctIntended.filter((r) => r.score === "correct").length, correctIntended.length),
      falseAccept: pct(errorIntended.filter((r) => r.score === "correct").length, errorIntended.length),
      uncertain: pct(rows.filter((r) => r.score === "uncertain").length, rows.length),
      p50: lat.length ? `${lat[Math.floor(lat.length / 2)]} ms` : "–",
    };
  }, [rows]);

  function exportCsv() {
    const header = ["target", "intended", "duration_ms", "transcript_a", "transcript_b", "ms_a", "ms_b", "total_ms", "score", "reason"];
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = rows.map((r) =>
      [r.target, r.intended, r.durationMs, r.transcriptA, r.transcriptB, r.msA, r.msB, r.totalMs, r.score, r.reason].map(esc).join(","),
    );
    const blob = new Blob(["﻿" + [header.join(","), ...lines].join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `phirse-spike-${new Date().toISOString().slice(0, 16)}.csv`;
    a.click();
  }

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:px-8">
      <header>
        <h1 className="text-3xl font-bold">Speech spike</h1>
        <p className="text-muted">
          Say a target word into the mic. Each attempt runs pass A (saaras:v3 verbatim) and pass B (saaras:v4 +
          keyterms) in parallel and is scored with the live decision table. Mark what you intended to say so the
          page can compute detection and false-accept rates.
        </p>
      </header>

      <section className="grid gap-4 rounded-2xl bg-surface p-5 shadow-sm sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          Access key (only needed in production)
          <input
            className="rounded-lg border border-accent-soft bg-white px-3 py-2"
            type="password"
            value={accessKey}
            onChange={(e) => {
              setAccessKey(e.target.value);
              writeLocal("phirse.spike.key", e.target.value);
            }}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          End-of-speech silence: {endOfSpeechMs} ms (applies on first start)
          <input type="range" min={600} max={4000} step={100} value={endOfSpeechMs} onChange={(e) => setEndOfSpeechMs(Number(e.target.value))} />
        </label>
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          Words — one per line: target | accepted form | …
          <textarea
            className="h-40 rounded-lg border border-accent-soft bg-white px-3 py-2 font-mono text-sm"
            value={wordsText}
            onChange={(e) => {
              setWordsText(e.target.value);
              writeLocal("phirse.spike.words", e.target.value);
            }}
          />
        </label>
      </section>

      <section className="flex flex-col gap-4 rounded-2xl bg-surface p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-muted">Target</span>
          <select
            className="rounded-lg border border-accent-soft bg-white px-3 py-2 text-xl"
            value={wordIndex}
            onChange={(e) => setWordIndex(Number(e.target.value))}
          >
            {words.map((w, i) => (
              <option key={i} value={i}>
                {w[0]}
              </option>
            ))}
          </select>
          <span className="text-sm text-muted">I will say</span>
          {(["correct", "error", "silence"] as Intended[]).map((v) => (
            <button
              key={v}
              onClick={() => setIntended(v)}
              className={`rounded-full px-4 py-2 text-sm ${intended === v ? "bg-calm text-white" : "bg-accent-soft"}`}
            >
              {v === "correct" ? "the word" : v === "error" ? "a wrong / near word" : "nothing"}
            </button>
          ))}
        </div>
        <p className="text-sm text-muted">Accepted: {current.join(" · ")}</p>
        <div className="flex items-center gap-4">
          <button
            onClick={toggleListening}
            className={`h-20 w-20 rounded-full text-lg font-bold text-white shadow ${listening ? "bg-alert" : "bg-accent"}`}
          >
            {listening ? "Stop" : "Listen"}
          </button>
          <span aria-live="polite" className="text-lg">
            {!listening ? "Mic off" : speaking ? "Hearing speech…" : busy ? "Scoring…" : "Listening"}
          </span>
          <button className="ml-auto text-sm underline" onClick={() => setWordIndex((i) => (i + 1) % Math.max(1, words.length))}>
            Next word
          </button>
        </div>
        {error && <p className="rounded-lg bg-alert/10 px-3 py-2 text-alert">{error}</p>}
      </section>

      <section className="flex flex-col gap-3 rounded-2xl bg-surface p-5 shadow-sm">
        <h2 className="text-xl font-bold">Voice (Bulbul v3)</h2>
        <input className="rounded-lg border border-accent-soft bg-white px-3 py-2 text-lg" value={ttsText} onChange={(e) => setTtsText(e.target.value)} />
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <label className="flex items-center gap-2">
            Speaker
            <select className="rounded-lg border border-accent-soft bg-white px-2 py-1" value={ttsSpeaker} onChange={(e) => setTtsSpeaker(e.target.value)}>
              {SPEAKERS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2">
            Pace {ttsPace.toFixed(2)}
            <input type="range" min={0.5} max={1.2} step={0.05} value={ttsPace} onChange={(e) => setTtsPace(Number(e.target.value))} />
          </label>
          <button onClick={playTts} className="rounded-full bg-calm px-4 py-2 text-white">
            Play
          </button>
          {ttsMs !== null && <span className="text-muted">{ttsMs} ms</span>}
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl bg-surface p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-6">
          <h2 className="text-xl font-bold">Results ({stats.n})</h2>
          <span>Detection: <b>{stats.detection}</b></span>
          <span>False accept: <b>{stats.falseAccept}</b></span>
          <span>Uncertain: <b>{stats.uncertain}</b></span>
          <span>p50 latency: <b>{stats.p50}</b></span>
          <button onClick={exportCsv} disabled={rows.length === 0} className="ml-auto rounded-full bg-accent-soft px-4 py-2 text-sm disabled:opacity-50">
            Export CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-muted">
              <tr>
                <th className="py-1">Target</th>
                <th>Intended</th>
                <th>Pass A</th>
                <th>Pass B</th>
                <th>Score</th>
                <th>Reason</th>
                <th>ms (A/B/total)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-accent-soft align-top">
                  <td className="py-1 text-base">{r.target}</td>
                  <td>{r.intended}</td>
                  <td className="text-base">{r.transcriptA ?? "—"}</td>
                  <td className="text-base">{r.transcriptB ?? "—"}</td>
                  <td className={r.score === "correct" ? "text-calm" : r.score === "uncertain" ? "text-accent" : ""}>{r.score}</td>
                  <td>
                    {r.reason}
                    {r.safety.length > 0 && <span className="ml-1 text-alert">⚠ {r.safety.map((s) => s.category).join(",")}</span>}
                    {r.errors.length > 0 && <span className="block text-alert">{r.errors.join("; ")}</span>}
                  </td>
                  <td>
                    {r.msA ?? "–"}/{r.msB ?? "–"}/{r.totalMs}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
