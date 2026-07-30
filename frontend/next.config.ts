import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Suprime o header X-Powered-By (information disclosure).
  poweredByHeader: false,

  async redirects() {
    return [
      {
        source: "/",
        destination: "/tech",
        permanent: false,
      },
    ];
  },

  // Security headers na camada que serve o HTML (mitiga clickjacking na origem).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "no-referrer" },
        ],
      },
    ];
  },
};

export default nextConfig;