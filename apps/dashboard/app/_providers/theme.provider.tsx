"use client";

import { useEffect } from "react";

import { DASHBOARD_CHROME_COLOR } from "../_components/chrome";

/**
 * Cromatura del browser per il gestionale.
 *
 * Il tema chiaro fisso (`next-themes`) sta invece nel layout radice: il suo
 * provider scrive uno `<script>` inline, che va reso dal server. Qui verrebbe
 * montato nel browser a ogni ingresso dal login, e React avvisa (giustamente)
 * che uno script creato dal client non parte.
 *
 * Safari su iOS colora le barre in alto e in basso con lo sfondo di `<html>`
 * e non sempre ascolta il meta `theme-color`: per questo si impostano tutti e
 * tre, e tutti dal colore dello sfondo — prima qui c'era un bianco fisso,
 * che lasciava due bande bianche sopra e sotto un fondo grigio chiaro.
 *
 * Il cleanup rimette i valori di prima: era nato quando la dashboard viveva
 * dentro il sito pubblico, e resta innocuo ora che è un'app a sé.
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

  return children;
}
