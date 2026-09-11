import { betterAuth } from "better-auth";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins";
import { adminAc, defaultAc, userAc } from "better-auth/plugins/admin/access";
import { getPrismaClient } from "@/lib/db";
import { nextUserSlug } from "@/lib/entity-slug";
import { passwordResetMail, sendMail } from "@/lib/mail";
import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
} from "@/lib/password-validation";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Ontbrekende env-variabele: ${name}`);
  return value;
}

function originFromHost(host: string | undefined): string | null {
  if (!host) return null;
  const normalized = host.startsWith("http://") || host.startsWith("https://")
    ? host
    : `https://${host}`;
  try {
    return new URL(normalized).origin;
  } catch {
    return null;
  }
}

function authTrustedOrigins(): string[] {
  const origins = new Set<string>([
    "http://localhost:3000",
    "https://troneseating.app",
    "https://www.troneseating.app",
    "https://troneseating.vercel.app",
  ]);

  for (const value of [
    process.env.BETTER_AUTH_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL,
  ]) {
    const origin = originFromHost(value);
    if (origin) origins.add(origin);
  }

  return [...origins];
}

const viewerAc = defaultAc.newRole({
  user: [],
  session: [],
});

function createAuth() {
  return betterAuth({
    appName: "TRÔNE Seating",
    baseURL: requireEnv("BETTER_AUTH_URL"),
    secret: requireEnv("BETTER_AUTH_SECRET"),
    database: prismaAdapter(getPrismaClient(), {
      provider: "mysql",
    }),
    user: {
      additionalFields: {
        isActive: {
          type: "boolean",
          required: false,
          defaultValue: true,
          input: false,
        },
        slug: {
          type: "string",
          required: false,
          input: false,
        },
      },
    },
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            const prisma = getPrismaClient();
            const slug = await nextUserSlug(prisma, user.name, user.id);
            await prisma.user.update({
              where: { id: user.id },
              data: { slug },
            });
          },
        },
      },
    },
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: MIN_PASSWORD_LENGTH,
      maxPasswordLength: MAX_PASSWORD_LENGTH,
      resetPasswordTokenExpiresIn: 60 * 60 * 24,
      sendResetPassword: async ({ user, url }) => {
        const content = passwordResetMail({ name: user.name, url });
        await sendMail({
          to: user.email,
          ...content,
        });
      },
      onPasswordReset: async ({ user }) => {
        const prisma = getPrismaClient();
        await prisma.user.update({
          where: { id: user.id },
          data: { emailVerified: true },
        });
      },
    },
    trustedOrigins: authTrustedOrigins(),
    plugins: [
      admin({
        defaultRole: "user",
        adminRoles: ["admin"],
        bannedUserMessage: "Dit account is gedeactiveerd.",
        roles: {
          admin: adminAc,
          user: userAc,
          viewer: viewerAc,
        },
      }),
      nextCookies(),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;

declare global {
  var __troneAuth: Auth | undefined;
}

export function getAuth(): Auth {
  if (!globalThis.__troneAuth) {
    globalThis.__troneAuth = createAuth();
  }
  return globalThis.__troneAuth;
}
