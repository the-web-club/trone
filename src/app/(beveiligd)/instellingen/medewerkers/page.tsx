import type { Metadata } from "next";
import Link from "next/link";
import { InviteUserForm } from "@/components/settings/invite-user-form";
import { StaffTable } from "@/components/settings/staff-table";
import { getSessionRole, requireSession } from "@/lib/auth-session";
import { listUsers, staffStatus } from "@/lib/user-service";

export const metadata: Metadata = { title: "Medewerkers" };

export default async function MedewerkersPage() {
  const session = await requireSession();
  const canManage = getSessionRole(session) === "admin";
  const users = await listUsers();

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div className="page-header-copy">
          <h1 className="page-header-title">Medewerkers</h1>
          <p className="page-header-description">
            Interne accounts voor het team. Nieuwe medewerkers stellen zelf een
            wachtwoord in via de uitnodigingsmail.
          </p>
        </div>
        {canManage ? (
          <div className="page-actions">
            <InviteUserForm />
          </div>
        ) : null}
      </header>

      <StaffTable
        currentUserId={session.user.id}
        canManage={canManage}
        users={users.map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: staffStatus(user),
        }))}
      />

      <p className="text-sm text-fg-muted">
        <Link href="/instellingen" className="hover:underline">
          Terug naar instellingen
        </Link>
      </p>
    </div>
  );
}
