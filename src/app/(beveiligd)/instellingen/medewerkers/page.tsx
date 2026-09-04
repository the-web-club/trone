import type { Metadata } from "next";
import Link from "next/link";
import { ListBody, ListBrowser } from "@/components/list/list-browser";
import { ListPagination } from "@/components/list/list-pagination";
import { InviteUserForm } from "@/components/settings/invite-user-form";
import { StaffFilters } from "@/components/settings/staff-filters";
import { StaffTable } from "@/components/settings/staff-table";
import { PageHeader } from "@/components/shell/page-header";
import { getSessionRole, requireSession } from "@/lib/auth-session";
import { listSummary } from "@/lib/list-copy";
import { buildStaffHref, parseStaffSearchParams } from "@/lib/staff-query";
import { listStaffRows, staffStatus } from "@/lib/user-service";
import type { StaffStatus, UserRole } from "@/lib/user-validation";

export const metadata: Metadata = { title: "Medewerkers" };

export default async function MedewerkersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireSession();
  const canManage = getSessionRole(session) === "admin";
  const parsed = parseStaffSearchParams(await searchParams);
  const hasFilters = Boolean(parsed.zoeken || parsed.rol || parsed.status);

  const result = await listStaffRows({
    query: parsed.zoeken || undefined,
    role: (parsed.rol || undefined) as UserRole | undefined,
    status: (parsed.status || undefined) as StaffStatus | undefined,
    page: parsed.pagina,
  });

  const totalPages = Math.max(Math.ceil(result.total / result.pageSize), 1);
  const emptyMessage = hasFilters
    ? "Geen medewerkers gevonden voor deze filters."
    : "Nog geen medewerkers.";

  return (
    <ListBrowser>
      <PageHeader
        title="Medewerkers"
        description="Interne accounts voor het team. Nieuwe medewerkers stellen zelf een wachtwoord in via de uitnodigingsmail."
        meta={[
          result.total === 0 && hasFilters
            ? "Geen resultaten"
            : listSummary(result.total, "medewerker", "medewerkers"),
        ]}
        actions={canManage ? <InviteUserForm /> : undefined}
      />
      <StaffFilters values={parsed} />
      <ListBody>
        <StaffTable
          currentUserId={session.user.id}
          canManage={canManage}
          emptyMessage={emptyMessage}
          users={result.items.map((user) => ({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            status: staffStatus(user),
          }))}
        />
        <ListPagination
          page={parsed.pagina}
          totalPages={totalPages}
          hrefForPage={(pagina) => buildStaffHref({ ...parsed, pagina })}
        />
      </ListBody>
      <p className="text-sm text-fg-muted">
        <Link href="/instellingen" className="hover:underline">
          Terug naar instellingen
        </Link>
      </p>
    </ListBrowser>
  );
}
