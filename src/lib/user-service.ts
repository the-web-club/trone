import "server-only";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getPrismaClient } from "@/lib/db";
import { AppError } from "@/lib/errors";
import type { InviteUserInput, StaffStatus, UserRole } from "@/lib/user-validation";

function hasCredentialPassword(accounts: { providerId: string; password: string | null }[]) {
  return accounts.some(
    (account) => account.providerId === "credential" && Boolean(account.password),
  );
}

export function staffStatus(user: {
  isActive: boolean;
  emailVerified: boolean;
  accounts: { providerId: string; password: string | null }[];
}): StaffStatus {
  if (!user.isActive) return "inactive";
  if (user.emailVerified || hasCredentialPassword(user.accounts)) return "active";
  return "invited";
}

export async function listUsers() {
  const prisma = getPrismaClient();
  return prisma.user.findMany({
    orderBy: { name: "asc" },
    include: {
      accounts: {
        select: { providerId: true, password: true },
      },
    },
  });
}

export async function getUser(id: string) {
  const prisma = getPrismaClient();
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      accounts: {
        select: { providerId: true, password: true },
      },
    },
  });

  if (!user) {
    throw new AppError("Medewerker niet gevonden.", "NOT_FOUND", 404);
  }

  return user;
}

async function countActiveAdmins(exceptUserId?: string) {
  const prisma = getPrismaClient();
  return prisma.user.count({
    where: {
      role: "admin",
      isActive: true,
      ...(exceptUserId ? { id: { not: exceptUserId } } : {}),
    },
  });
}

export async function inviteUser(input: InviteUserInput) {
  const prisma = getPrismaClient();
  const existing = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
  });
  if (existing) {
    throw new AppError("Dit e-mailadres is al in gebruik.", "VALIDATION");
  }

  const created = await auth.api.createUser({
    body: {
      name: input.name,
      email: input.email,
      role: input.role,
      data: { isActive: true },
    },
    headers: await headers(),
  });

  await sendInvitation(created.user.id);
  return created.user;
}

export async function sendInvitation(userId: string) {
  const user = await getUser(userId);
  if (!user.isActive) {
    throw new AppError("Een gedeactiveerde medewerker kan geen uitnodiging ontvangen.", "VALIDATION");
  }

  const request = await auth.api.requestPasswordReset({
    body: {
      email: user.email,
      redirectTo: "/wachtwoord-instellen",
    },
  });

  if (!request.status) {
    throw new AppError("Uitnodiging versturen is mislukt.", "MAIL");
  }
}

export async function updateUserRole(userId: string, role: UserRole, actorUserId: string) {
  const user = await getUser(userId);

  if (user.role === "admin" && role !== "admin") {
    const remaining = await countActiveAdmins(userId);
    if (remaining === 0) {
      throw new AppError("De laatste beheerder kan geen andere rol krijgen.", "VALIDATION");
    }
  }

  if (userId === actorUserId && user.role === "admin" && role !== "admin") {
    throw new AppError("Je kunt je eigen beheerdersrol niet wijzigen.", "VALIDATION");
  }

  const prisma = getPrismaClient();
  return prisma.user.update({
    where: { id: userId },
    data: { role },
  });
}

export async function setUserActive(
  userId: string,
  isActive: boolean,
  actorUserId: string,
) {
  const user = await getUser(userId);

  if (userId === actorUserId && !isActive) {
    throw new AppError("Je kunt jezelf niet deactiveren.", "VALIDATION");
  }

  if (user.role === "admin" && user.isActive && !isActive) {
    const remaining = await countActiveAdmins(userId);
    if (remaining === 0) {
      throw new AppError("De laatste beheerder kan niet worden gedeactiveerd.", "VALIDATION");
    }
  }

  const prisma = getPrismaClient();
  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      isActive,
      banned: isActive ? false : true,
      banReason: isActive ? null : "Gedeactiveerd",
      banExpires: null,
    },
  });

  if (!isActive) {
    await prisma.session.deleteMany({ where: { userId } });
  }

  return updated;
}
