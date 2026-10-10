"use client";

import { ThemeProvider } from "next-themes";
import { useEffect } from "react";

import { DASHBOARD_CHROME_COLOR } from "../_components/chrome";

/**
 * Tema chiaro fisso e cromatura del browser per la dashboard.
 *
 * Safari su iOS colora le barre in alto e in basso con lo sfondo di `<html>`
 * e non sempre ascolta il meta `theme-color`: per questo si impostano tutti e
 * tre, e tutti dal colore dello sfondo — prima qui c'era un bianco fisso,
 * che lasciava due bande bianche sopra e sotto un fondo grigio chiaro.
 *
 * Uscendo dalla dashboard i valori di prima tornano al loro posto: il resto
 * del sito non deve ereditare lo sfondo e il blocco dello scorrimento
 * elastico di qui.
 */
export default function InternalThemeProvider({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const meta = document.querySelector("meta[name=theme-color]");
    const viewport = document.querySelector("meta[name=viewport]");

    const previous = {
      meta: meta?.getAttribute("content") ?? null,
      htmlBackground: html.style.backgroundColor,
      htmlOverscroll: html.style.overscrollBehavior,
      bodyBackground: body.style.backgroundColor,
      bodyOverscroll: body.style.overscrollBehavior,
    };

    meta?.setAttribute("content", DASHBOARD_CHROME_COLOR);
    html.style.backgroundColor = "var(--background)";
    body.style.backgroundColor = "var(--background)";
    html.style.overscrollBehavior = "none";
    body.style.overscrollBehavior = "none";

    // Le aree sicure di iOS servono anche alla barra in basso.
    const content = viewport?.getAttribute("content") ?? "";
    if (viewport && !content.includes("viewport-fit")) {
      viewport.setAttribute("content", `${content}, viewport-fit=cover`);
    }

    return () => {
      if (meta && previous.meta !== null) {
        meta.setAttribute("content", previous.meta);
      }
      html.style.backgroundColor = previous.htmlBackground;
      html.style.overscrollBehavior = previous.htmlOverscroll;
      body.style.backgroundColor = previous.bodyBackground;
      body.style.overscrollBehavior = previous.bodyOverscroll;
    };
  }, []);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      forcedTheme="light"
      enableSystem={false}
    >
      {children}
    </ThemeProvider>
  );
}
