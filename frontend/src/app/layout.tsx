import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Instrument_Serif, Noto_Sans_Kannada } from "next/font/google";
import "./globals.css";

const sans = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const display = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});
const kannada = Noto_Sans_Kannada({
  subsets: ["kannada"],
  weight: ["400", "500", "600"],
  variable: "--font-kn",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SahayaVoice – Multilingual Civic Assistant",
  description:
    "Speak in Kannada, Hindi, Tamil, Telugu or English. SahayaVoice generates a formal Kannada civic complaint letter, reads it back, and exports it as a PDF.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0b0c16" },
    { media: "(prefers-color-scheme: light)", color: "#f8f5ef" },
  ],
};

/** Sets the theme before first paint so there is no light/dark flash. */
const themeScript = `(function(){try{var t=localStorage.getItem('sv-theme');if(!t){t=window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'}document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme='dark'}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${sans.variable} ${display.variable} ${kannada.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="grain min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
