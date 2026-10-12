import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
