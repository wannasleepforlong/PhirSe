import type { Metadata } from "next";
import PatientSession from "./PatientSession";

export const metadata: Metadata = {
  title: "आज का अभ्यास · PhirSe",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function PatientPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <PatientSession token={token} />;
}
