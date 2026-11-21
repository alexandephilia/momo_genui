"use client";

import { useRef } from "react";
import { useServerInsertedHTML } from "next/navigation";

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

export function ThemeInitScript() {
  const inserted = useRef(false);
  useServerInsertedHTML(() => {
    if (inserted.current) return null;
    inserted.current = true;
    return <script id="momo-theme-init" dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />;
  });
  return null;
}
