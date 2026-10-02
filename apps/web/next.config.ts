import type { NextConfig } from "next";

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
    return [
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
