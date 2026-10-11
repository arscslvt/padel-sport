import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["lucide-react", "react-icons", "date-fns"],
  },
};

export default nextConfig;
