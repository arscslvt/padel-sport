import type { MetadataRoute } from "next";

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
    name: "Padel Sport — Gestionale",
    short_name: "Gestionale",
    description: "Agenda, richieste e clienti di Padel Sport Melilli.",
    lang: "it",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: DASHBOARD_CHROME_COLOR,
    theme_color: DASHBOARD_CHROME_COLOR,
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
