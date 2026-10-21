import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      { source: "/questions/:path*", destination: "/skill-tree", permanent: false },
      { source: "/teacher/questions/:path*", destination: "/teacher/skill-trees", permanent: false },
    ];
  },
};

export default nextConfig;
