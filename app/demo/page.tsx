import { redirect } from "next/navigation";

// Read-only showcase dashboard with real sessions and clarity scores.
export default function DemoDashboard() {
  const token = process.env.DEMO_SHOWCASE_TOKEN;
  if (!token) redirect("/");
  redirect(`/p/${token}/dashboard`);
}
