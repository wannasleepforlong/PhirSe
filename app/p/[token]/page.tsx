import type { Metadata, Viewport } from "next";
import { uiMode } from "@/lib/i18n/server";
import { profileFromToken } from "@/lib/profile/service";
import PatientSession from "./PatientSession";

export const metadata: Metadata = {
  title: "आज का अभ्यास · PhirSe",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export const viewport: Viewport = { themeColor: "#1e2a63" };

export default async function PatientPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  // A bad link still renders: the start button then explains the link no longer works.
  const profile = await profileFromToken(token).catch(() => null);
  return <PatientSession token={token} mode={await uiMode()} familyPhone={profile?.family_phone ?? null} />;
}
