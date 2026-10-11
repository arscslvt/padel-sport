import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import type React from "react";
import { SIGN_IN_PATH } from "@/lib/auth-routes";
import { ConvexClientProvider } from "@/providers/convex.provider";
import { DASHBOARD_CHROME_COLOR } from "./_components/chrome";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Dashboard",
    template: "%s | Dashboard Padel Sport",
  },
  description: "Area riservata allo staff autorizzato.",
  icons: {
    icon: [
      {
        url: "/favicon/black-icon.png",
        media: "(prefers-color-scheme: light)",
      },
      { url: "/favicon/white-icon.png", media: "(prefers-color-scheme: dark)" },
    ],
  },
  // Il gestionale non ha niente da far trovare ai motori di ricerca.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  // Lo stesso grigio chiarissimo del fondo: la barra di stato non fa stacco.
  themeColor: DASHBOARD_CHROME_COLOR,
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/**
 * La radice: documento, Clerk e Convex. La cornice del gestionale (barra
 * laterale, barra in basso, tour) sta in `(staff)/layout.tsx`; l'accesso in
 * `(auth)`, che non la vuole — chi deve ancora entrare non ha niente da
 * navigare.
 *
 * Il login è nostro (`/sign-in`), non la pagina ospitata da Clerk: lo dicono
 * qui `signInUrl` e, per le pagine protette, l'opzione gemella in `proxy.ts`.
 */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider
      signInUrl={SIGN_IN_PATH}
      signInFallbackRedirectUrl="/"
      afterSignOutUrl={SIGN_IN_PATH}
    >
      <html
        lang="it"
        suppressHydrationWarning
        data-scroll-behavior="smooth"
        className={`${geistSans.variable} ${geistMono.variable}`}
      >
        <body className="font-sans antialiased">
          {/*
           * Il gestionale è solo chiaro. Il provider sta qui, reso dal server
           * una volta sola: il suo script inline nel browser non partirebbe.
           */}
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            forcedTheme="light"
            enableSystem={false}
          >
            <ConvexClientProvider>{children}</ConvexClientProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
