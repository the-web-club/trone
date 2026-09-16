import "server-only";

import { headers } from "next/headers";
import { randomBytes } from "node:crypto";
import { logAuditEvent } from "@/lib/audit/log";
import { AUDIT_ACTIONS } from "@/lib/audit/registry";
import { getAuth } from "@/lib/auth";
import { uploadImage } from "@/lib/blob";
import { getPrismaClient } from "@/lib/db";
import { nextUserSlug } from "@/lib/entity-slug";
import { AppError } from "@/lib/errors";
import { isSubmissionId } from "@/lib/form-submission";
import { createId } from "@/lib/id";
import { invitationMail, passwordResetMail, sendMail } from "@/lib/mail";
import {
  INVITATION_VALID_DAYS,
  invitationResetUrl,
  PASSWORD_RESET_VALID_HOURS,
} from "@/lib/mail-template";
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
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { image },
  });
  await logAuditEvent({
    eventType: "UPDATE",
    category: "USERS",
    action: AUDIT_ACTIONS.userAvatarUpdate,
    entityType: "user",
    entityId: updated.id,
    entityLabel: updated.name,
    // De blob-URL zelf voegt niets toe aan het log.
    metadata: {
      verwijderd: file === null,
      eigenProfiel: actor.userId === updated.id,
    },
  });
  return updated;
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

export async function inviteUser(
  input: InviteUserInput,
  options?: { submissionId?: string },
) {
  const prisma = getPrismaClient();
  const submissionId = options?.submissionId?.trim() || undefined;
  if (submissionId && !isSubmissionId(submissionId)) {
    throw new AppError(
      "Ongeldige indiening. Ververs de pagina en probeer opnieuw.",
      "VALIDATION",
    );
  }
  const email = input.email.toLowerCase();

  if (submissionId) {
    const existingBySubmission = await prisma.user.findUnique({
      where: { submissionId },
    });
    if (existingBySubmission) {
      if (
        existingBySubmission.email !== email ||
        existingBySubmission.name !== input.name
      ) {
        throw new AppError(
          "Deze indiening hoort bij andere gegevens. Ververs de pagina en probeer opnieuw.",
          "CONFLICT",
          409,
        );
      }
      return existingBySubmission;
    }
  }

  const existing = await prisma.user.findUnique({
    where: { email },
    include: {
      accounts: { select: { providerId: true, password: true } },
    },
  });
  if (existing) {
    if (staffStatus(existing) === "invited") {
      if (submissionId && existing.submissionId === submissionId) {
        return existing;
      }
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

  if (submissionId) {
    try {
      await prisma.user.update({
        where: { id: created.user.id },
        data: { submissionId },
      });
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code: unknown }).code === "P2002"
      ) {
        const replayed = await prisma.user.findUnique({
          where: { submissionId },
        });
        if (replayed) {
          if (replayed.email !== email || replayed.name !== input.name) {
            throw new AppError(
              "Deze indiening hoort bij andere gegevens. Ververs de pagina en probeer opnieuw.",
              "CONFLICT",
              409,
            );
          }
          return replayed;
        }
      }
      throw error;
    }
  }

  // Pas hier loggen: alle eerdere paden leveren een bestaand teamlid terug en
  // zijn dus geen nieuwe uitnodiging.
  await logAuditEvent({
    eventType: "CREATE",
    category: "USERS",
    action: AUDIT_ACTIONS.userInvite,
    entityType: "user",
    entityId: created.user.id,
    entityLabel: created.user.name,
    severity: "NOTICE",
    metadata: { rol: input.role },
  });
  // Niet via sendInvitation: dit is de eerste uitnodiging, geen herhaling.
  await deliverInvitation(created.user.id);
  return created.user;
}

async function createPasswordResetToken(userId: string, ttlMs: number) {
  const token = randomBytes(24).toString("base64url");
  const prisma = getPrismaClient();
  await prisma.verification.create({
    data: {
      id: createId(),
      identifier: `reset-password:${token}`,
      value: userId,
      expiresAt: new Date(Date.now() + ttlMs),
    },
  });
  return token;
}

/**
 * Verstuurt de uitnodigingsmail en logt alleen de verzending. Zo krijgt een
 * eerste uitnodiging geen `invite_resend`-event.
 */
async function deliverInvitation(userId: string) {
  const user = await getUser(userId);
  if (!user.isActive) {
    throw new AppError("Een gedeactiveerd teamlid kan geen uitnodiging ontvangen.", "VALIDATION");
  }

  const token = await createPasswordResetToken(
    user.id,
    INVITATION_VALID_DAYS * 24 * 60 * 60 * 1000,
  );

  await sendMail({
    to: user.email,
    ...invitationMail({
      name: user.name,
      url: invitationResetUrl(token, process.env.BETTER_AUTH_URL),
    }),
  });

  // Alleen de soort mail en de ontvanger; nooit het token of de uitnodigingslink.
  await logAuditEvent({
    eventType: "EMAIL_SENT",
    category: "COMMUNICATION",
    action: AUDIT_ACTIONS.emailSend,
    entityType: "user",
    entityId: user.id,
    entityLabel: user.email,
    metadata: { soort: "uitnodiging", geldigDagen: INVITATION_VALID_DAYS },
  });

  return user;
}

export async function sendInvitation(userId: string) {
  const user = await deliverInvitation(userId);

  await logAuditEvent({
    eventType: "UPDATE",
    category: "USERS",
    action: AUDIT_ACTIONS.userInviteResend,
    entityType: "user",
    entityId: user.id,
    entityLabel: user.name,
    metadata: { soort: "uitnodiging" },
  });
}

export async function requestPasswordReset(email: string) {
  const prisma = getPrismaClient();
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
  if (!user?.isActive) return;

  const token = await createPasswordResetToken(
    user.id,
    PASSWORD_RESET_VALID_HOURS * 60 * 60 * 1000,
  );

  await sendMail({
    to: user.email,
    ...passwordResetMail({
      name: user.name,
      url: invitationResetUrl(token, process.env.BETTER_AUTH_URL),
    }),
  });

  // Loopt zonder sessie: de actor is hier bewust de systeemactor. Nooit het
  // token of de resetlink loggen, en alleen loggen als er echt een mail uitging.
  await logAuditEvent({
    eventType: "PASSWORD_RESET_REQUESTED",
    category: "AUTH",
    action: AUDIT_ACTIONS.passwordResetRequest,
    entityType: "user",
    entityId: user.id,
    entityLabel: user.name,
    severity: "NOTICE",
    metadata: { geldigUren: PASSWORD_RESET_VALID_HOURS },
  });

  await logAuditEvent({
    eventType: "EMAIL_SENT",
    category: "COMMUNICATION",
    action: AUDIT_ACTIONS.emailSend,
    entityType: "user",
    entityId: user.id,
    entityLabel: user.email,
    metadata: { soort: "wachtwoordreset" },
  });
}

export async function updateUserRole(userId: string, role: UserRole, actorUserId: string) {
  const user = await getUser(userId);

  if (user.role === "admin" && role !== "admin") {
    const remaining = await countActiveAdmins(userId);
    if (remaining === 0) {
      // Een geweigerde rolwijziging is ook informatie: iemand probeerde het.
      await logAuditEvent({
        eventType: "UPDATE",
        category: "USERS",
        action: AUDIT_ACTIONS.userRoleChange,
        result: "FAILURE",
        entityType: "user",
        entityId: user.id,
        entityLabel: user.name,
        metadata: {
          reden: "Laatste beheerder",
          vorige: user.role,
          nieuwe: role,
        },
      });
      throw new AppError("De laatste beheerder kan geen andere rol krijgen.", "VALIDATION");
    }
  }

  if (userId === actorUserId && user.role === "admin" && role !== "admin") {
    await logAuditEvent({
      eventType: "UPDATE",
      category: "USERS",
      action: AUDIT_ACTIONS.userRoleChange,
      result: "FAILURE",
      entityType: "user",
      entityId: user.id,
      entityLabel: user.name,
      metadata: {
        reden: "Eigen beheerdersrol",
        vorige: user.role,
        nieuwe: role,
      },
    });
    throw new AppError("Je kunt je eigen beheerdersrol niet wijzigen.", "VALIDATION");
  }

  const prisma = getPrismaClient();
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { role },
  });
  await logAuditEvent({
    eventType: "UPDATE",
    category: "USERS",
    action: AUDIT_ACTIONS.userRoleChange,
    entityType: "user",
    entityId: updated.id,
    entityLabel: updated.name,
    severity: "NOTICE",
    metadata: { vorige: user.role, nieuwe: updated.role },
  });
  return updated;
}

export async function setUserActive(
  userId: string,
  isActive: boolean,
  actorUserId: string,
) {
  const user = await getUser(userId);

  if (userId === actorUserId && !isActive) {
    // Geweigerde deactivatie: relevant voor een beheerder om terug te zien.
    await logAuditEvent({
      eventType: "STATUS_CHANGED",
      category: "USERS",
      action: AUDIT_ACTIONS.userDeactivate,
      result: "FAILURE",
      entityType: "user",
      entityId: user.id,
      entityLabel: user.name,
      metadata: { reden: "Eigen account" },
    });
    throw new AppError("Je kunt jezelf niet deactiveren.", "VALIDATION");
  }

  if (user.role === "admin" && user.isActive && !isActive) {
    const remaining = await countActiveAdmins(userId);
    if (remaining === 0) {
      await logAuditEvent({
        eventType: "STATUS_CHANGED",
        category: "USERS",
        action: AUDIT_ACTIONS.userDeactivate,
        result: "FAILURE",
        entityType: "user",
        entityId: user.id,
        entityLabel: user.name,
        metadata: { reden: "Laatste beheerder" },
      });
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

  let purgedSessions = 0;
  if (!isActive) {
    const purged = await prisma.session.deleteMany({ where: { userId } });
    purgedSessions = purged.count;
  }

  await logAuditEvent({
    eventType: "STATUS_CHANGED",
    category: "USERS",
    action: isActive ? AUDIT_ACTIONS.userActivate : AUDIT_ACTIONS.userDeactivate,
    entityType: "user",
    entityId: updated.id,
    entityLabel: updated.name,
    severity: "NOTICE",
    metadata: {
      actief: isActive,
      vorige: user.isActive,
      sessiesVerwijderd: purgedSessions,
    },
  });

  return updated;
}
