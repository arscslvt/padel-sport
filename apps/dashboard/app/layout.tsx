import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import type React from "react";
import { KeyboardInset } from "@/components/ui/keyboard-inset";
import { APP_NAME, appIcon } from "@/lib/app";
import { SIGN_IN_PATH } from "@/lib/auth-routes";
import { ConvexClientProvider } from "@/providers/convex.provider";
import { DASHBOARD_CHROME_COLOR } from "./_components/chrome";
import { StatusBarScrim } from "./_components/status-bar-scrim";
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
    apple: appIcon("apple-touch-icon.png"),
  },
  // Aggiunto alla schermata Home di un iPhone si apre a tutto schermo, senza
  // la barra di Safari: è anche la condizione perché riceva le notifiche push.
  appleWebApp: {
    capable: true,
    title: APP_NAME,
    statusBarStyle: "default",
  },
  // Il gestionale non ha niente da far trovare ai motori di ricerca.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  // Lo stesso colore del fondo, chiaro o scuro: la barra di stato non fa
  // stacco. Chi sceglie un tema diverso da quello del sistema lo ritrova
  // aggiornato dal provider del tema, nel browser.
  themeColor: [
    {
      media: "(prefers-color-scheme: light)",
      color: DASHBOARD_CHROME_COLOR.light,
    },
    {
      media: "(prefers-color-scheme: dark)",
      color: DASHBOARD_CHROME_COLOR.dark,
    },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/**
 * I componenti di Clerk (il profilo) con i colori del gestionale. Sono
 * variabili CSS, non valori: seguono il tema da sole, senza un secondo tema
 * di Clerk da accendere e spegnere.
 */
const CLERK_APPEARANCE = {
  variables: {
    colorPrimary: "var(--primary)",
    colorPrimaryForeground: "var(--primary-foreground)",
    colorDanger: "var(--destructive)",
    colorNeutral: "var(--foreground)",
    colorForeground: "var(--card-foreground)",
    colorMuted: "var(--muted)",
    colorMutedForeground: "var(--muted-foreground)",
    colorBackground: "var(--card)",
    colorInput: "var(--card)",
    colorInputForeground: "var(--card-foreground)",
    colorBorder: "var(--border)",
    colorRing: "var(--ring)",
  },
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
      appearance={CLERK_APPEARANCE}
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
           * Chiaro o scuro, di base come il sistema; la scelta si cambia da
           * «Aspetto» (theme-picker.tsx). Il provider sta qui, reso dal server
           * una volta sola: il suo script inline nel browser non partirebbe.
           * Senza transizioni al cambio, o ogni superficie sfumerebbe per
           * conto suo.
           */}
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <ConvexClientProvider>{children}</ConvexClientProvider>
          </ThemeProvider>
          <StatusBarScrim />
          {/* La tastiera misurata per i drawer: components/ui/keyboard-inset.tsx */}
          <KeyboardInset />
        </body>
      </html>
    </ClerkProvider>
  );
}
