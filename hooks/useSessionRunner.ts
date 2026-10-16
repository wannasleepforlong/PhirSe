"use client";

// Drives one practice session in the browser: plays clips, listens with Silero VAD,
// runs the patience timer, supports barge-in, and talks to the session API.
// The server decides every step; this hook only plays, listens and reports.

import { useCallback, useEffect, useRef, useState } from "react";
import { encodeWav, durationMs } from "@/lib/audio/wav";

export type CueStep = "prompt" | "semantic" | "phonemic" | "model";

export interface ClientAction {
  kind: "play_and_listen" | "play_only" | "ask_yes_no" | "safety_exit" | "end";
  clips: { url: string; text: string; key: string }[];
  listen?: { patienceMs: number; endOfSpeechMs: number; maxAttemptMs: number };
  itemId?: string;
  cue?: CueStep;
  progress: { done: number; total: number };
  phase: string;
  imageUrl?: string | null;
}

export type RunnerStatus =
  | "idle"
  | "preparing"
  | "speaking"     // agent audio playing
  | "listening"    // waiting for the patient
  | "hearing"      // patient is speaking
  | "thinking"     // uploading / scoring
  | "asking"       // yes/no question on screen
  | "paused"
  | "done"
  | "safety"
  | "error";

type MicVADLike = {
  start: () => Promise<void>;
  pause: () => Promise<void>;
  destroy: () => Promise<void>;
  setOptions: (o: { redemptionMs?: number }) => void;
};

type ListenMode = "off" | "bargein" | "answer";

export function useSessionRunner(token: string) {
  const [status, setStatus] = useState<RunnerStatus>("idle");
  const [action, setAction] = useState<ClientAction | null>(null);
  const [caption, setCaption] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const vad = useRef<MicVADLike | null>(null);
  const sessionId = useRef<string | null>(null);
  const audioEl = useRef<HTMLAudioElement | null>(null);
  const blobCache = useRef(new Map<string, string>());
  const listenMode = useRef<ListenMode>("off");
  const promptEndedAt = useRef<number | null>(null);
  const speechStartedAt = useRef<number | null>(null);
  const patienceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxAttemptTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const current = useRef<ClientAction | null>(null);
  const playToken = useRef(0);
  const busy = useRef(false);

  const headers = { "x-patient-token": token };

  const clearTimers = () => {
    if (patienceTimer.current) clearTimeout(patienceTimer.current);
    if (maxAttemptTimer.current) clearTimeout(maxAttemptTimer.current);
    patienceTimer.current = null;
    maxAttemptTimer.current = null;
  };

  const stopAudio = () => {
    playToken.current++;
    const el = audioEl.current;
    if (el) {
      el.pause();
      el.removeAttribute("src");
    }
  };

  const cachedUrl = (clip: { url: string; key: string }) => blobCache.current.get(clip.key) ?? clip.url;

  /** Play clips in order. Resolves false if interrupted (barge-in or a new action). */
  const playClips = useCallback(async (clips: ClientAction["clips"]): Promise<boolean> => {
    const myToken = ++playToken.current;
    const el = audioEl.current ?? (audioEl.current = new Audio());
    for (const clip of clips) {
      if (myToken !== playToken.current) return false;
      setCaption(clip.text);
      el.src = cachedUrl(clip);
      try {
        await el.play();
        await new Promise<void>((resolve, reject) => {
          el.onended = () => resolve();
          el.onerror = () => reject(new Error("audio error"));
          el.onpause = () => (myToken !== playToken.current ? resolve() : undefined);
        });
      } catch {
        if (myToken !== playToken.current) return false;
      }
    }
    return myToken === playToken.current;
  }, []);

  const post = useCallback(
    async (path: string, body: BodyInit, json = true) => {
      const res = await fetch(path, {
        method: "POST",
        headers: json ? { ...headers, "content-type": "application/json" } : headers,
        body,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `request failed (${res.status})`);
      return data;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [token],
  );

  const sendEvent = useCallback(
    async (type: string) => {
      if (!sessionId.current) return;
      clearTimers();
      listenMode.current = "off";
      setStatus("thinking");
      try {
        const data = await post(`/api/p/session/${sessionId.current}/event`, JSON.stringify({ type }));
        await runAction(data.action);
      } catch (e) {
        setError((e as Error).message);
        setStatus("error");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [post],
  );

  const startPatience = (a: ClientAction) => {
    promptEndedAt.current = performance.now();
    speechStartedAt.current = null;
    listenMode.current = "answer";
    setStatus("listening");
    if (a.kind === "play_and_listen" && a.listen) {
      patienceTimer.current = setTimeout(() => {
        if (listenMode.current === "answer" && speechStartedAt.current === null) void sendEvent("silence_timeout");
      }, a.listen.patienceMs);
    }
  };

  const runAction = useCallback(
    async (a: ClientAction) => {
      clearTimers();
      current.current = a;
      setAction(a);

      if (a.kind === "safety_exit") {
        listenMode.current = "off";
        setStatus("safety");
        await playClips(a.clips);
        await vad.current?.pause();
        return;
      }
      if (a.kind === "end") {
        listenMode.current = "off";
        setStatus("done");
        await vad.current?.pause();
        return;
      }

      if (a.listen) vad.current?.setOptions({ redemptionMs: a.listen.endOfSpeechMs });
      // Patient speech during agent audio stops the agent (barge-in).
      listenMode.current = a.kind === "play_only" ? "off" : "bargein";
      setStatus(a.kind === "ask_yes_no" ? "asking" : "speaking");
      const finished = await playClips(a.clips);
      if (current.current !== a) return;

      if (a.kind === "play_only") {
        if (a.phase === "PAUSED") {
          setStatus("paused");
          return;
        }
        if (finished) void sendEvent("played");
        return;
      }
      if (finished) {
        startPatience(a);
        if (a.kind === "ask_yes_no") setStatus("asking");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [playClips, sendEvent],
  );

  const onSpeechStart = useCallback(() => {
    if (listenMode.current === "off" || busy.current) return;
    const a = current.current;
    if (listenMode.current === "bargein") {
      stopAudio();
      promptEndedAt.current = performance.now();
      listenMode.current = "answer";
    }
    if (patienceTimer.current) clearTimeout(patienceTimer.current);
    patienceTimer.current = null;
    speechStartedAt.current = performance.now();
    setStatus(a?.kind === "ask_yes_no" ? "asking" : "hearing");
    if (a?.listen) {
      maxAttemptTimer.current = setTimeout(() => void vad.current?.pause().then(() => vad.current?.start()), a.listen.maxAttemptMs);
    }
  }, []);

  const onSpeechEnd = useCallback(
    async (samples: Float32Array) => {
      if (listenMode.current !== "answer" || busy.current || !sessionId.current) return;
      clearTimers();
      busy.current = true;
      listenMode.current = "off";
      setStatus("thinking");
      const latency =
        promptEndedAt.current !== null && speechStartedAt.current !== null
          ? Math.max(0, Math.round(speechStartedAt.current - promptEndedAt.current))
          : null;
      try {
        const form = new FormData();
        form.append("audio", new Blob([encodeWav(samples)], { type: "audio/wav" }), "attempt.wav");
        form.append("durationMs", String(durationMs(samples)));
        if (latency !== null) form.append("latencyMs", String(latency));
        form.append("speechDetected", "true");
        const data = await post(`/api/p/session/${sessionId.current}/attempt`, form, false);
        busy.current = false;
        await runAction(data.action);
      } catch (e) {
        busy.current = false;
        setError((e as Error).message);
        setStatus("error");
      }
    },
    [post, runAction],
  );

  const handlers = useRef({ onSpeechStart, onSpeechEnd });
  handlers.current = { onSpeechStart, onSpeechEnd };

  const start = useCallback(async () => {
    setError(null);
    setStatus("preparing");
    try {
      // Unlock audio playback on iOS/Safari with the user's tap.
      const el = audioEl.current ?? (audioEl.current = new Audio());
      el.muted = true;
      el.src = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=";
      await el.play().catch(() => undefined);
      el.muted = false;

      if (!vad.current) {
        const { MicVAD } = await import("@ricky0123/vad-web");
        vad.current = (await MicVAD.new({
          model: "v5",
          baseAssetPath: "/vad/",
          onnxWASMBasePath: "/vad/",
          redemptionMs: 1500,
          minSpeechMs: 200,
          preSpeechPadMs: 300,
          submitUserSpeechOnPause: true,
          getStream: () =>
            navigator.mediaDevices.getUserMedia({
              audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            }),
          onSpeechStart: () => handlers.current.onSpeechStart(),
          onSpeechEnd: (s: Float32Array) => void handlers.current.onSpeechEnd(s),
        })) as unknown as MicVADLike;
      }
      await vad.current.start();

      const data = (await post("/api/p/session/start", "{}")) as {
        sessionId: string;
        action: ClientAction;
        prefetch: { key: string; url: string }[];
      };
      sessionId.current = data.sessionId;
      // Download every clip now so turns never wait on the network for audio.
      await Promise.all(
        data.prefetch.map(async ({ key, url }) => {
          try {
            const blob = await (await fetch(url)).blob();
            blobCache.current.set(key, URL.createObjectURL(blob));
          } catch {
            /* fall back to streaming that clip */
          }
        }),
      );
      await runAction(data.action);
    } catch (e) {
      const msg = (e as Error).message;
      setError(/permission|denied|notallowed/i.test(msg) ? "mic" : msg);
      setStatus("error");
    }
  }, [post, runAction]);

  const answer = useCallback((yes: boolean) => void sendEvent(yes ? "yes" : "no"), [sendEvent]);
  const skip = useCallback(() => {
    stopAudio();
    void sendEvent("skip");
  }, [sendEvent]);
  const pause = useCallback(() => {
    stopAudio();
    void sendEvent("pause");
  }, [sendEvent]);
  const resume = useCallback(() => void sendEvent("resume"), [sendEvent]);
  const stop = useCallback(() => {
    stopAudio();
    void sendEvent("stop");
  }, [sendEvent]);
  const help = useCallback(() => {
    stopAudio();
    void sendEvent("help");
  }, [sendEvent]);

  useEffect(
    () => () => {
      clearTimers();
      stopAudio();
      void vad.current?.destroy();
      for (const u of blobCache.current.values()) URL.revokeObjectURL(u);
    },
    [],
  );

  return { status, action, caption, error, start, answer, skip, pause, resume, stop, help };
}
