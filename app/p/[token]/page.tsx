import type { Metadata, Viewport } from "next";
import { uiMode } from "@/lib/i18n/server";
import PatientSession from "./PatientSession";

export const metadata: Metadata = {
  title: "आज का अभ्यास · PhirSe",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export const viewport: Viewport = { themeColor: "#1e2a63" };

export default async function PatientPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <PatientSession token={token} mode={await uiMode()} />;
}
