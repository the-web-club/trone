import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth, type Auth } from "@/lib/auth";
import { AppError } from "@/lib/errors";

export type AppSession = NonNullable<
  Awaited<ReturnType<Auth["api"]["getSession"]>>
>;

export async function getSession(): Promise<AppSession | null> {
  const session = await getAuth().api.getSession({
    headers: await headers(),
  });
  return session;
}

export async function requireSession(): Promise<AppSession> {
  const session = await getSession();
  if (!session) {
    redirect("/inloggen");
  }
  return session;
}

export function getSessionRole(session: AppSession): string {
  const role = (session.user as { role?: string | null }).role;
  return role ?? "user";
}

export function isAdminSession(session: AppSession): boolean {
  return getSessionRole(session) === "admin";
}

export async function requireAdmin(): Promise<AppSession> {
  const session = await requireSession();
  if (!isAdminSession(session)) {
    throw new AppError("Alleen een beheerder mag dit doen.", "FORBIDDEN", 403);
  }
  return session;
}
