"use client";

import { ThemeProvider } from "next-themes";
import { ConvexClientProvider } from "./convex.provider";
import { usePathname } from "next/navigation";

export default function Providers({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const isTournament = pathname?.startsWith("/tournament");

  return (
    <ConvexClientProvider>
      <ThemeProvider
        attribute="data-theme"
        defaultTheme="light"
        themes={["light", "dark", "neutral"]}
        enableSystem
        disableTransitionOnChange
        forcedTheme={isTournament ? "neutral" : undefined}
      >
        {children}
      </ThemeProvider>
    </ConvexClientProvider>
  );
}
