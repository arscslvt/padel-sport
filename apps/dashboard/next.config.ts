import path from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Server autonomo con i soli file usati, tracciati dalla radice del
  // monorepo (backend e pacchetti condivisi stanno fuori da apps/dashboard):
  // è quello che va in produzione, vedi scripts/stage-standalone.sh.
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../.."),
  // In sviluppo, per provare il gestionale da telefono attraverso il tunnel
  // ngrok (lo stesso del sito): senza, Next blocca gli script della pagina.
  allowedDevOrigins: ["fluent-guinea-choice.ngrok-free.app"],
  experimental: {
    optimizePackageImports: ["lucide-react", "react-icons", "date-fns"],
  },
  async headers() {
    return [
      {
        // Il service worker delle notifiche (public/sw.js) non va mai servito
        // dalla cache: il browser lo ricontrolla a ogni navigazione, e una
        // copia vecchia resterebbe installata sui telefoni dello staff.
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self'",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
