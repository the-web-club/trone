import { betterAuth } from "better-auth";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins";
import { getPrismaClient } from "@/lib/db";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Ontbrekende env-variabele: ${name}`);
  return value;
}

export const auth = betterAuth({
  appName: "TRÔNE Seating",
  baseURL: requireEnv("BETTER_AUTH_URL"),
  secret: requireEnv("BETTER_AUTH_SECRET"),
  database: prismaAdapter(getPrismaClient(), {
    provider: "mysql",
  }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 5,
    maxPasswordLength: 128,
  },
  trustedOrigins: ["http://localhost:3000"],
  plugins: [
    admin({
      defaultRole: "user",
      adminRoles: ["admin"],
    }),
    nextCookies(),
  ],
});
