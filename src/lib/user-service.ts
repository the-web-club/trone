import "server-only";

import { headers } from "next/headers";
import { getAuth } from "@/lib/auth";
import { uploadImage } from "@/lib/blob";
import { getPrismaClient } from "@/lib/db";
import { nextUserSlug } from "@/lib/entity-slug";
import { AppError } from "@/lib/errors";
import { withResetPasswordCapture } from "@/lib/mail-capture";
import { invitationMail, sendMail } from "@/lib/mail";
import { paginateArgs } from "@/lib/list-query";
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

export async function listUsersForSelect(): Promise<
  Array<{ id: string; name: string; image: string | null; slug: string | null }>
> {
  const prisma = getPrismaClient();
  return prisma.user.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, image: true, slug: true },
  });
}

export async function listStaffRows(filters?: {
  query?: string;
  role?: string;
  status?: StaffStatus;
  page?: number;
  pageSize?: number;
}) {
  const users = await listUsers();
  const query = filters?.query?.trim().toLowerCase() ?? "";
  const filtered = users.filter((user) => {
    if (query) {
      const haystack = `${user.name} ${user.email}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    if (filters?.role && user.role !== filters.role) return false;
    if (filters?.status && staffStatus(user) !== filters.status) return false;
    return true;
  });
  const { page, pageSize, skip, take } = paginateArgs(
    filters?.page,
    filters?.pageSize,
  );
  const pageItems = filtered.slice(skip, skip + take);
  const items = [];
  for (const user of pageItems) {
    items.push(await ensureUserSlug(user));
  }
  return {
    items,
    total: filtered.length,
    page,
    pageSize,
  };
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
    throw new AppError("Teamlid niet gevonden.", "NOT_FOUND", 404);
  }

  return ensureUserSlug(user);
}

export async function getStaffBySlug(slug: string) {
  const prisma = getPrismaClient();
  const include = {
    accounts: {
      select: { providerId: true, password: true },
    },
  } as const;

  const user =
    (await prisma.user.findUnique({
      where: { slug },
      include,
    })) ??
    (await prisma.user.findUnique({
      where: { id: slug },
      include,
    }));

  if (!user) {
    throw new AppError("Teamlid niet gevonden.", "NOT_FOUND", 404);
  }

  return ensureUserSlug(user);
}

export async function getStaffDetail(slug: string) {
  const user = await getStaffBySlug(slug);
  const prisma = getPrismaClient();
  const deals = await prisma.deal.findMany({
    where: { ownerUserId: user.id },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      isHot: true,
      company: { select: { id: true, slug: true, name: true } },
      contact: {
        select: { slug: true, firstName: true, lastName: true },
      },
      stage: { select: { name: true, isWon: true, isLost: true } },
    },
  });

  const companyIds = [
    ...new Set(
      deals
        .map((deal) => deal.company?.id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const companies = await prisma.company.findMany({
    where: {
      OR: [
        { ownerUserId: user.id },
        ...(companyIds.length > 0 ? [{ id: { in: companyIds } }] : []),
      ],
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      city: true,
      ownerUserId: true,
    },
  });

  return { user, deals, companies };
}

export async function updateUserImage(
  userId: string,
  file: File | null,
  actor: { userId: string; isAdmin: boolean },
) {
  if (!actor.isAdmin && actor.userId !== userId) {
    throw new AppError("Je mag alleen je eigen avatar wijzigen.", "FORBIDDEN", 403);
  }

  const user = await getUser(userId);
  const prisma = getPrismaClient();
  const image = file ? await uploadImage(file, `avatars/${user.id}`) : null;
  return prisma.user.update({
    where: { id: user.id },
    data: { image },
  });
}

async function ensureUserSlug<T extends { id: string; name: string; slug: string | null }>(
  user: T,
): Promise<T & { slug: string }> {
  if (user.slug) return user as T & { slug: string };
  const prisma = getPrismaClient();
  const slug = await nextUserSlug(prisma, user.name, user.id);
  await prisma.user.update({
    where: { id: user.id },
    data: { slug },
  });
  return { ...user, slug };
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
    include: {
      accounts: { select: { providerId: true, password: true } },
    },
  });
  if (existing) {
    if (staffStatus(existing) === "invited") {
      await sendInvitation(existing.id);
      return existing;
    }
    throw new AppError("Dit e-mailadres is al in gebruik.", "VALIDATION");
  }

  const created = await getAuth().api.createUser({
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

  try {
    // Geen request-headers meegeven: Better Auth ziet die als browser-POST en
    // weigert ze (geen Origin), terwijl de uitnodiging dan stil faalt.
    // Better Auth slikt fouten in sendResetPassword stil (status: true).
    // Daarom vangen we de reset-URL en versturen we zelf via Resend.
    const { captured } = await withResetPasswordCapture(async () => {
      const request = await getAuth().api.requestPasswordReset({
        body: {
          email: user.email,
          redirectTo: "/wachtwoord-instellen",
        },
      });
      if (!request.status) {
        throw new AppError("Uitnodiging versturen is mislukt.", "MAIL");
      }
    });

    if (!captured) {
      console.error(
        "Uitnodiging versturen mislukt: geen reset-mail vastgelegd voor",
        user.email,
      );
      throw new AppError("Uitnodiging versturen is mislukt.", "MAIL");
    }

    await sendMail({
      to: captured.email,
      ...invitationMail({ name: captured.name, url: captured.url }),
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error("Uitnodiging versturen mislukt:", error);
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
