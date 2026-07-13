import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        // In production, BACKEND_URL should be set to your deployed backend URL.
        destination: `${process.env.BACKEND_URL || 'http://localhost:7777'}/:path*`, 
      },
    ];
  },
};

export default nextConfig;
