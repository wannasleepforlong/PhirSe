import type { Metadata, Viewport } from "next";
import { Mukta, Inter } from "next/font/google";
import "./globals.css";

const mukta = Mukta({
  variable: "--font-mukta",
  subsets: ["devanagari", "latin"],
  weight: ["400", "500", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PhirSe — फिर से",
  description:
    "Voice-first Hindi word-finding practice for stroke survivors with aphasia, prescribed by a speech-language pathologist.",
};

export const viewport: Viewport = {
  themeColor: "#f6efe6",
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
      <body className={`${mukta.variable} ${inter.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
