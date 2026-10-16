// Copies the env vars the web app needs from .env into the linked Vercel project (production).
// Usage: node scripts/vercel-env.mjs   (after `npx vercel login` and `npx vercel link`)
// Values are sent through the Vercel CLI only; nothing is printed.
import fs from "node:fs";
import { spawnSync } from "node:child_process";

const NEEDED = [
  "SARVAM_API_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "TOKEN_PEPPER",
  "DEMO_SHOWCASE_TOKEN",
];

const env = Object.fromEntries(
  fs
    .readFileSync(".env", "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);

for (const name of NEEDED) {
  const value = env[name];
  if (!value) {
    console.log(`skip ${name}: empty in .env`);
    continue;
  }
  spawnSync("npx", ["-y", "vercel@latest", "env", "rm", name, "production", "--yes"], { stdio: "ignore", shell: true });
  const r = spawnSync("npx", ["-y", "vercel@latest", "env", "add", name, "production"], { input: value, stdio: ["pipe", "ignore", "pipe"], shell: true });
  console.log(`${r.status === 0 ? "set " : "FAILED "}${name}${r.status === 0 ? "" : ": " + String(r.stderr).trim().split("\n").pop()}`);
}
