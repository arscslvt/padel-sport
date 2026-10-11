"use client";

import { ThemeProvider } from "next-themes";
import { ConvexClientProvider } from "./convex.provider";

export default function Providers({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  /*
   * Il tema non è una preferenza dell'utente: il sito è solo chiaro, e
   * imporlo qui lo rende corretto già al primo paint.
   */
  return (
    <ConvexClientProvider>
      <ThemeProvider
        attribute="data-theme"
        defaultTheme="light"
        disableTransitionOnChange
        forcedTheme="light"
      >
        {children}
      </ThemeProvider>
    </ConvexClientProvider>
  );
}
