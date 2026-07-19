import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["fluent-guinea-choice.ngrok-free.app"],
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "react-icons",
      "date-fns",
      "@radix-ui/react-icons",
    ],
  },
  async redirects() {
    return [
      {
        source: "/book",
        destination: "https://www.sumupbookings.com/a-s-d-padel-sport-melilli",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
