"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    const db = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { error } = await db.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setState("error");
      setMessage(error.message);
    } else {
      setState("sent");
    }
  }

  if (state === "sent") {
    return <p className="rounded-xl bg-surface p-4">Check {email} for a sign-in link.</p>;
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        Work email
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-xl border border-accent-soft bg-white px-3 py-3 text-base"
        />
      </label>
      <button disabled={state === "sending"} className="rounded-xl bg-accent px-4 py-3 font-medium text-white disabled:opacity-60">
        {state === "sending" ? "Sending…" : "Email me a sign-in link"}
      </button>
      {state === "error" && <p className="text-sm text-alert">{message}</p>}
    </form>
  );
}
