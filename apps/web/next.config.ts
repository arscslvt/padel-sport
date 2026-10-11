import type { NextConfig } from "next";

import { dashboardUrl } from "./lib/dashboard-url";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["fluent-guinea-choice.ngrok-free.app"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
        pathname: "/images/**",
      },
    ],
  },
  async redirects() {
    const dashboard = dashboardUrl();

    return [
      {
        // Il gestionale ha lasciato il sito per un dominio suo. I vecchi
        // indirizzi sono nei segnalibri dello staff e nelle notifiche già
        // arrivate: devono continuare ad aprire la stessa pagina, che di là
        // sta alla radice (`/dashboard/clients` → `/clients`). La query
        // passa da sola, ed è quella che apre la scheda giusta.
        source: "/dashboard",
        destination: dashboard,
        permanent: false,
      },
      {
        source: "/dashboard/:path*",
        destination: `${dashboard}/:path*`,
        permanent: false,
      },
      {
        // Il Tournament Desk non è più sul sito: la gestione dei tornei
        // tornerà dentro il gestionale.
        source: "/management/:path*",
        destination: dashboard,
        permanent: false,
      },
      {
        // Il tabellone del Trofeo San Sebastiano: il torneo è finito, ma il
        // link è girato sui social e nei gruppi. Resta la pagina del torneo.
        source: "/tournament/:path*",
        destination: "/trofeo-san-sebastiano",
        permanent: false,
      },
      {
        // Le prime prenotazioni hanno ricevuto QR e mail con il vecchio
        // indirizzo italiano: quei codici sono già in giro e devono continuare
        // ad aprirsi.
        source: "/prenotazione/:code",
        destination: "/booking/:code",
        permanent: false,
      },
      {
        // «Le tue prenotazioni» è diventata una sezione dell'area personale:
        // il vecchio indirizzo è nei menu delle pagine già aperte e nei
        // segnalibri, e deve continuare a portare lì.
        source: "/bookings",
        destination: "/me#bookings",
        permanent: false,
      },
      {
        // Il primo indirizzo dell'area personale: è dentro le mail dei punti
        // già spedite, che devono continuare ad aprirsi.
        source: "/area-personale",
        destination: "/me",
        permanent: true,
      },
    ];
  },
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "react-icons",
      "date-fns",
      "@radix-ui/react-icons",
    ],
  },
};

export default nextConfig;
