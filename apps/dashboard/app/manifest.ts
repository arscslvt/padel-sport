import type { MetadataRoute } from "next";

import { APP_NAME } from "@/lib/app";

import { DASHBOARD_CHROME_COLOR } from "./_components/chrome";

/**
 * Il gestionale come app installabile.
 *
 * Non è un vezzo: su iPhone le notifiche push arrivano solo alle web app
 * aggiunte alla schermata Home (iOS 16.4+), e `display: standalone` è il
 * requisito perché Safari la tratti come tale. Su Android l'installazione è
 * facoltativa — le notifiche arrivano anche da Chrome — ma l'icona sulla
 * schermata Home e il numero sopra (Badging API) sono lo stesso comodi.
 *
 * Servito come `/manifest.webmanifest`, che il middleware di Clerk lascia
 * passare senza sessione (proxy.ts): il browser lo chiede prima del login.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: APP_NAME,
    // Sotto l'icona iOS e Android tagliano oltre i 12 caratteri circa: il
    // nome intero può diventare «Padel Sport…», ed è comunque riconoscibile.
    short_name: APP_NAME,
    description: "Agenda, richieste e clienti di Padel Sport Melilli.",
    lang: "it",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    // Il manifest ha un colore solo, senza varianti per tema: resta quello
    // chiaro. A pagina aperta comandano i meta `theme-color` (layout.tsx).
    background_color: DASHBOARD_CHROME_COLOR.light,
    theme_color: DASHBOARD_CHROME_COLOR.light,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
