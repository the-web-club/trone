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
  async redirects() {
    return [
      { source: "/taken", destination: "/overzicht", permanent: false },
      { source: "/taken/:path*", destination: "/overzicht", permanent: false },
      { source: "/logboek", destination: "/overzicht", permanent: false },
      { source: "/logboek/:path*", destination: "/overzicht", permanent: false },
    ];
  },
  agentRules: false,
};

export default nextConfig;
