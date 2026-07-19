import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  async rewrites() {
    // Automatically use local server in dev mode, otherwise use production BACKEND_URL
    const isDev = process.env.NODE_ENV !== 'production';
    const backendUrl = isDev 
      ? 'http://localhost:7777' 
      : (process.env.BACKEND_URL || 'http://localhost:7777');
      
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
      {
        source: "/api/:path*",
        destination: `${backendUrl}/:path*`, 
      },
    ];
  },
};

export default nextConfig;
