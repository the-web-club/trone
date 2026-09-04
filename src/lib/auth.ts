import { betterAuth } from "better-auth";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins";
import { adminAc, defaultAc, userAc } from "better-auth/plugins/admin/access";
import { getPrismaClient } from "@/lib/db";
import { invitationMail, sendMail } from "@/lib/mail";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Ontbrekende env-variabele: ${name}`);
  return value;
}

const viewerAc = defaultAc.newRole({
  user: [],
  session: [],
});

export const auth = betterAuth({
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
    },
  },
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 5,
    maxPasswordLength: 128,
    sendResetPassword: async ({ user, url }) => {
      const content = invitationMail({ name: user.name, url });
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
  trustedOrigins: ["http://localhost:3000"],
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
