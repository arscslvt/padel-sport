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
