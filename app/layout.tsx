import type { Metadata, Viewport } from "next";
import { Anek_Devanagari, Tiro_Devanagari_Hindi } from "next/font/google";
import "./globals.css";

// Anek Devanagari for all interface text (variable width + weight); Tiro for display headlines.
const anek = Anek_Devanagari({
  variable: "--font-anek",
  subsets: ["devanagari", "latin"],
  axes: ["wdth"],
  display: "swap",
});

const tiro = Tiro_Devanagari_Hindi({
  variable: "--font-tiro",
  subsets: ["devanagari", "latin"],
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PhirSe — फिर से",
  description:
    "Daily Hindi word-finding practice at home for people with aphasia after a stroke, with progress the family can see.",
};

export const viewport: Viewport = {
  themeColor: "#1e2a63",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="hi">
      <body className={`${anek.variable} ${tiro.variable} antialiased`}>{children}</body>
    </html>
  );
}
