"use client";

import { ThemeProvider } from "next-themes";
import { ConvexClientProvider } from "./convex.provider";
import { usePathname } from "next/navigation";

export default function Providers({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();

  /*
   * Il tema è una proprietà della rotta, non una preferenza dell'utente: lo
   * imponiamo qui, così è già corretto al primo paint. Lasciarlo correggere a
   * un effetto nel layout faceva lampeggiare la palette di chi arrivava sul
   * sito pubblico da /management (dove localStorage aveva salvato "neutral").
   */
  const isNeutral =
    pathname?.startsWith("/tournament") || pathname?.startsWith("/management");

  return (
    <ConvexClientProvider>
      <ThemeProvider
        attribute="data-theme"
        defaultTheme="light"
        themes={["light", "dark", "neutral"]}
        disableTransitionOnChange
        forcedTheme={isNeutral ? "neutral" : "light"}
      >
        {children}
      </ThemeProvider>
    </ConvexClientProvider>
  );
}
