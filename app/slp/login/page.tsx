import LoginForm from "./LoginForm";

export const metadata = { title: "SLP sign in · PhirSe" };

const ERRORS: Record<string, string> = {
  demo: "Demo sign-in is turned off on this server.",
  expired: "That sign-in link was already used or has expired. Request a new link below.",
  browser: "Open the sign-in link in the same browser where you requested it, or request a new link here.",
  link: "That sign-in link did not work. Request a new link below.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const demoEnabled = process.env.DEMO_LOGIN_ENABLED === "true";
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-4">
      <div>
        <p className="text-sm font-medium uppercase tracking-widest text-calm">PhirSe · for therapists</p>
        <h1 className="mt-1 text-3xl font-bold">Sign in</h1>
        <p className="mt-2 text-muted">For registered speech-language pathologists supervising PhirSe home practice.</p>
      </div>
      {error && (
        <p className="rounded-lg bg-alert/10 px-3 py-2 text-alert">
          {ERRORS[error] ?? ERRORS.link}
        </p>
      )}
      <LoginForm />
      {demoEnabled && (
        <form action="/api/auth/demo" method="post" className="flex flex-col gap-2 border-t border-accent-soft pt-6">
          <button className="rounded-xl bg-calm px-4 py-3 font-medium text-white">Continue as demo SLP</button>
          <p className="text-sm text-muted">Simulated patient and role-play data only.</p>
        </form>
      )}
    </main>
  );
}
