import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

process.env.SERWIST_SUPPRESS_TURBOPACK_WARNING = "1";
const enableSwInDev = process.env.NEXT_PUBLIC_ENABLE_SW_DEV === "true";

if (process.env.NODE_ENV === "production") {
  const value = process.env.NEXT_PUBLIC_API_URL;
  let apiUrl: URL;
  try {
    apiUrl = new URL(value || "");
  } catch {
    throw new Error("Production builds require NEXT_PUBLIC_API_URL to be an absolute HTTPS API URL");
  }
  if (apiUrl.protocol !== "https:" || apiUrl.username || apiUrl.password
    || /^(?:localhost|127(?:\.\d{1,3}){3}|0\.0\.0\.0|\[::1\])$/.test(apiUrl.hostname)
    || apiUrl.hostname.endsWith(".localhost")) {
    throw new Error("Production builds require a non-loopback HTTPS API URL without credentials");
  }
}

const nextConfig: NextConfig = {
  turbopack: {},
  // Lets the dev server (HTTP requests AND the webpack/turbopack HMR
  // WebSocket) accept connections arriving with a Host header other than
  // localhost — needed to locally test SupraSpace's dedicated subdomain via
  // a hosts-file entry (127.0.0.1 space.suprah-app.com). Without this, Next
  // treats the request as a potential DNS-rebinding attempt and blocks it,
  // which is what got the page stuck at a permanent "0%" compiling overlay.
  allowedDevOrigins: ["space.suprah-app.com"],
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
