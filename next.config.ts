import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["mariadb", "@prisma/adapter-mariadb"],
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
  agentRules: false,
};

export default nextConfig;
