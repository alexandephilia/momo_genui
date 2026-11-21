import type { Metadata, Viewport } from "next";
import {
  Indie_Flower,
  Instrument_Sans,
  Instrument_Serif,
  Reenie_Beanie,
  Space_Grotesk,
} from "next/font/google";
import type { ReactNode } from "react";
import { MotionProvider } from "@/components/providers/MotionProvider";
import "./globals.css";

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-instrument-sans",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
  display: "swap",
});

const reenieBeanie = Reenie_Beanie({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-reenie-beanie",
  display: "swap",
});

const indieFlower = Indie_Flower({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-indie-flower",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Momo — Asisten Kerja Interaktif",
  description: "Momo: asisten pintar yang berganti kostum dan peran sesuai pekerjaan lo.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#efefef" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0d10" },
  ],
  width: "device-width",
  initialScale: 1,
};

const CRITICAL_THEME_CSS = `
html, body { background-color: #efefef; color: #141416; color-scheme: light; }
@media (prefers-color-scheme: dark) {
  html:not([data-theme="light"]),
  html:not([data-theme="light"]) body { background-color: #0c0d10; color: #f2f2f4; color-scheme: dark; }
}
html[data-theme="dark"],
html[data-theme="dark"] body { background-color: #0c0d10; color: #f2f2f4; color-scheme: dark; }
html[data-theme="light"],
html[data-theme="light"] body { background-color: #efefef; color: #141416; color-scheme: light; }
html:not(.theme-ready) *,
html:not(.theme-ready) *::before,
html:not(.theme-ready) *::after { transition: none !important; }
`;

const THEME_INIT_SCRIPT = `(() => {
  try {
    const raw = localStorage.getItem("momo.theme");
    const t = raw === "dark" || raw === "light"
      ? raw
      : (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const el = document.documentElement;
    el.dataset.theme = t;
    el.style.colorScheme = t;
    const metas = document.querySelectorAll('meta[name="theme-color"]');
    metas.forEach((m) => m.setAttribute("content", t === "dark" ? "#0c0d10" : "#efefef"));
  } catch {}
})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="id"
      className={`${instrumentSans.variable} ${instrumentSerif.variable} ${reenieBeanie.variable} ${indieFlower.variable} ${spaceGrotesk.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <style id="momo-critical-theme" dangerouslySetInnerHTML={{ __html: CRITICAL_THEME_CSS }} />
        <script id="momo-theme-init" dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className={instrumentSans.className}>
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
