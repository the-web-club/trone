import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "mariadb",
    "@prisma/adapter-mariadb",
    "@react-pdf/renderer",
  ],
  outputFileTracingIncludes: {
    "/offertes/[slug]/pdf": [
      "./public/brand/fonts/**/*",
      "./src/lib/pdf/fonts/**/*",
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
  agentRules: false,
};

export default nextConfig;
