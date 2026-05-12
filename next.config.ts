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
};

export default nextConfig;
