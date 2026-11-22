import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SahayaVoice – Multilingual Civic Assistant",
  description:
    "Speak in Kannada, Hindi, Tamil, Telugu or English. SahayaVoice generates a formal Kannada civic complaint letter, reads it back, and exports it as a PDF.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
