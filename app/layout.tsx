import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import Script from "next/script";
import { Geist, Geist_Mono, Unbounded } from "next/font/google";
import "./globals.css";
import Providers from "@/providers/provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const unbounded = Unbounded({
  variable: "--font-unbounded",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
});

export const metadata: Metadata = {
  title: {
    default: "ASD PadelSport Melilli | Campi, Tornei e Lezioni",
    template: "%s | PadelSport Melilli",
  },
  description:
    "Prenota un campo, partecipa ai tornei o segui lezioni al PadelSport Melilli. Il punto di riferimento per gli amanti del padel in provincia di Siracusa.",
  keywords: [
    "padel Melilli",
    "campi padel",
    "tornei padel",
    "lezioni padel",
    "prenotazioni padel",
    "PadelSport Melilli",
    "club padel Siracusa",
  ],
  icons: {
    icon: [
      {
        url: "/favicon/black-icon.png",
        media: "(prefers-color-scheme: light)",
      },
      { url: "/favicon/white-icon.png", media: "(prefers-color-scheme: dark)" },
    ],
  },
  authors: [{ name: "ASD PadelSport Melilli" }],
  creator: "ASD PadelSport Melilli",
  publisher: "ASD PadelSport Melilli",
  robots: { index: true, follow: true },
  alternates: {
    canonical: "https://www.asdpadelsport.com/",
  },
  openGraph: {
    type: "website",
    locale: "it_IT",
    url: "https://www.asdpadelsport.com/",
    siteName: "ASD PadelSport Melilli",
    title: "ASD PadelSport Melilli | Campi, Tornei e Lezioni",
    description:
      "Scopri ASD PadelSport Melilli: prenota campi outdoor, partecipa ai tornei e vivi la passione per il padel in Sicilia.",
    images: [
      {
        url: "https://www.asdpadelsport.com/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Campi da padel di ASD PadelSport Melilli",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ASD PadelSport Melilli | Campi, Tornei e Lezioni",
    description:
      "Prenota il tuo campo e divertiti con ASD PadelSport Melilli, il club di riferimento per il padel in provincia di Siracusa.",
    images: ["https://www.asdpadelsport.com/og-image.jpg"],
    creator: "@padelsportmelilli",
  },
  category: "sports",
  metadataBase: new URL("https://www.asdpadelsport.com"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${unbounded.variable} antialiased`}
      >
        <Providers>{children}</Providers>
        <Analytics />
        <Script
          id="structured-data"
          type="application/ld+json"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: It's necessary for JSON-LD
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SportsClub",
              name: "ASD PadelSport Melilli",
              image: "https://www.asdpadelsport.com/og-image.jpg",
              url: "https://www.asdpadelsport.com/",
              telephone: "+39 3201755897",
              address: {
                "@type": "PostalAddress",
                streetAddress: "Via Pertini",
                addressLocality: "Melilli",
                postalCode: "96010",
                addressCountry: "IT",
              },
              openingHoursSpecification: [
                {
                  "@type": "OpeningHoursSpecification",
                  dayOfWeek: [
                    "Monday",
                    "Tuesday",
                    "Wednesday",
                    "Thursday",
                    "Friday",
                    "Saturday",
                    "Sunday",
                  ],
                  opens: "09:00",
                  closes: "12:30",
                },
                {
                  "@type": "OpeningHoursSpecification",
                  dayOfWeek: [
                    "Monday",
                    "Tuesday",
                    "Wednesday",
                    "Thursday",
                    "Friday",
                    "Saturday",
                    "Sunday",
                  ],
                  opens: "14:30",
                  closes: "21:30",
                },
              ],
              sameAs: [
                "https://www.instagram.com/padelsportmelilli/",
                "https://www.facebook.com/padelsportmelilli/",
              ],
              description:
                "ASD PadelSport Melilli è un club moderno con campi outdoor, lezioni di padel, tornei e corsi per ogni livello di gioco.",
            }),
          }}
        />
      </body>
    </html>
  );
}
