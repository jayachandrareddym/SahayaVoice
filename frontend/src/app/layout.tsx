import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SahayaVoice – Multilingual Civic Assistant",
  description:
    "Real-time, dialect-aware Voice AI assistant for Bengaluru. Speak your complaint, get a formal Kannada letter.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
