export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-10 px-4 py-16 sm:px-8">
      <header className="flex flex-col gap-3">
        <p className="text-sm font-medium uppercase tracking-widest text-calm">
          PhirSe · फिर से
        </p>
        <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
          शब्द फिर से — words, again.
        </h1>
        <p className="text-lg text-muted">
          Voice-first Hindi word-finding practice for stroke survivors with
          aphasia. Prescribed and supervised by a speech-language pathologist.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          ["धैर्य", "Patience first", "Waits through long word-finding pauses. Never cuts in, never says wrong."],
          ["ईमानदार", "Honest scoring", "Two-pass speech checks against the target word. Unsure answers go to the SLP."],
          ["सुरक्षित", "Safety built in", "Stroke warning signs and distress stop the session and alert family and SLP."],
        ].map(([hi, en, body]) => (
          <div key={en} className="rounded-2xl bg-surface p-5 shadow-sm">
            <p className="text-2xl font-bold text-accent">{hi}</p>
            <p className="font-medium">{en}</p>
            <p className="mt-2 text-sm text-muted">{body}</p>
          </div>
        ))}
      </section>

      <footer className="text-sm text-muted">
        PhirSe is not an emergency service. For new stroke signs, call 112 or
        108 at once.
      </footer>
    </main>
  );
}
