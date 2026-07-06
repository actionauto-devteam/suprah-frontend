import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

process.env.SERWIST_SUPPRESS_TURBOPACK_WARNING = "1";
const enableSwInDev = process.env.NEXT_PUBLIC_ENABLE_SW_DEV === "true";

const nextConfig: NextConfig = {
  turbopack: {},
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate, proxy-revalidate",
          },
          {
            key: "Pragma",
            value: "no-cache",
          },
          {
            key: "Expires",
            value: "0",
          },
        ],
      },
    ];
  },
  async rewrites() {
    return {
      fallback: [
        {
          source: '/api/:path*',
          destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/:path*`,
        },
      ],
    }
  },
  experimental: {
    serverActions: {
      allowedOrigins: [
        "nctbkrf4-3000.asse.devtunnels.ms",
        "xj3pd14h-3000.asse.devtunnels.ms",
        "localhost:3001",
        "localhost:3000"
      ],
    },
  },
  images: {
    qualities: [75, 100],
  },
};

export default withSerwistInit({
  swSrc: "src/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development" && !enableSwInDev,
})(nextConfig);
