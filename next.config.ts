import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["mariadb", "@prisma/adapter-mariadb"],
  agentRules: false,
};

export default nextConfig;
