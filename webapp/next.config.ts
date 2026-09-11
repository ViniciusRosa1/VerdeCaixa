import type { NextConfig } from "next";

const apiTarget = process.env.API_PROXY_TARGET?.replace(/\/$/, "");

const config: NextConfig = {
  output: "standalone",

  async rewrites() {
    if (!apiTarget) return [];

    return [
      {
        source: "/api/:path*",
        destination: `${apiTarget}/api/:path*`,
      },
    ];
  },
};

export default config;