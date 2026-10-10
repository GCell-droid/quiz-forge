import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  async rewrites() {
    // Determine the backend target URL
    const rawBackend =
      process.env.BACKEND_URL ||
      (process.env.NEXT_PUBLIC_BACKEND_URL?.startsWith("http")
        ? process.env.NEXT_PUBLIC_BACKEND_URL
        : "") ||
      "http://localhost:7777";
    const backendUrl = rawBackend.replace(/\/$/, "");

    return [
      // Explicitly proxy socket.io and FORCE the trailing slash for the backend
      {
        source: "/api/socket.io",
        destination: `${backendUrl}/socket.io/`,
      },
      {
        source: "/api/socket.io/:path*",
        destination: `${backendUrl}/socket.io/:path*`,
      },
      // All other /api requests proxy to the backend
      {
        source: "/api/:path*",
        destination: `${backendUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
