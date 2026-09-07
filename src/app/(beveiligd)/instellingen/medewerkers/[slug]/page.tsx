import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DealHotIcon } from "@/components/deal/deal-hot-icon";
import { DealStagePill } from "@/components/deal/deal-stage-pill";
import { CompanyLink, ContactLink, DealLink } from "@/components/entity-links";
import { StaffAvatarEditor } from "@/components/settings/staff-avatar-editor";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableEmptyRow,
  TableHeader,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import { isAdminSession, requireSession } from "@/lib/auth-session";
import { isAppError } from "@/lib/errors";
import { staffPath } from "@/lib/paths";
import { getStaffDetail, staffStatus } from "@/lib/user-service";
import { userRoleLabels, type UserRole } from "@/lib/user-validation";

const statusCopy: Record<
  ReturnType<typeof staffStatus>,
  { label: string; tone: "success" | "info" | "default" }
> = {
  active: { label: "Actief", tone: "success" },
  invited: { label: "Uitgenodigd", tone: "info" },
  inactive: { label: "Gedeactiveerd", tone: "default" },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  try {
    const { slug } = await params;
    const { user } = await getStaffDetail(slug);
    return { title: user.name };
  } catch {
    return { title: "Medewerker" };
  }
}

export default async function MedewerkerDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [session, detail] = await Promise.all([
    requireSession(),
    getStaffDetail(slug).catch((error) => {
      if (isAppError(error) && error.status === 404) notFound();
      throw error;
    }),
  ]);
  const { user, deals, companies } = detail;
  if (slug !== user.slug) redirect(staffPath(user));

  const status = statusCopy[staffStatus(user)];
  const role = (["admin", "user", "viewer"] as const).includes(
    user.role as UserRole,
  )
    ? (user.role as UserRole)
    : null;
  const canEditAvatar =
    isAdminSession(session) || session.user.id === user.id;
  const isSelf = session.user.id === user.id;

  return (
    <div className="flex flex-col gap-8">
      <header className="page-header">
        <div className="flex min-w-0 items-start gap-4">
          <StaffAvatarEditor
            userId={user.id}
            name={user.name}
            image={user.image}
            canEdit={canEditAvatar}
          />
          <div className="page-header-copy">
            <h1 className="page-header-title">{user.name}</h1>
            <p className="page-header-meta">
              <span>{user.email}</span>
              <span className="text-fg-subtle" aria-hidden>
                ·
              </span>
              <span>{role ? userRoleLabels[role] : user.role}</span>
              <span className="text-fg-subtle" aria-hidden>
                ·
              </span>
              <Badge tone={status.tone}>{status.label}</Badge>
              {isSelf ? (
                <>
                  <span className="text-fg-subtle" aria-hidden>
                    ·
                  </span>
                  <span>Jij</span>
                </>
              ) : null}
            </p>
            <div className="page-header-description">
              <Link href="/instellingen/medewerkers" className="hover:underline">
                Terug naar medewerkers
              </Link>
            </div>
          </div>
        </div>
      </header>

      <section className="flex flex-col gap-4">
        <h2 className="text-md font-medium text-fg">Leads</h2>
        <TableContainer>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHeaderCell>Lead</TableHeaderCell>
                <TableHeaderCell>Bedrijf</TableHeaderCell>
                <TableHeaderCell>Contact</TableHeaderCell>
                <TableHeaderCell>Fase</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deals.length === 0 ? (
                <TableEmptyRow colSpan={4}>
                  Nog geen leads gekoppeld aan deze medewerker.
                </TableEmptyRow>
              ) : (
                deals.map((deal) => (
                  <TableRow key={deal.id}>
                    <TableCell>
                      <span className="inline-flex min-w-0 items-center gap-1">
                        <DealLink deal={deal} primary />
                        {deal.isHot ? <DealHotIcon /> : null}
                      </span>
                    </TableCell>
                    <TableCell className="text-fg-muted">
                      <CompanyLink company={deal.company} />
                    </TableCell>
                    <TableCell className="text-fg-muted">
                      <ContactLink contact={deal.contact} />
                    </TableCell>
                    <TableCell>
                      <DealStagePill
                        name={deal.stage.name}
                        isWon={deal.stage.isWon}
                        isLost={deal.stage.isLost}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-md font-medium text-fg">Bedrijven</h2>
        <TableContainer>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHeaderCell>Bedrijf</TableHeaderCell>
                <TableHeaderCell>Plaats</TableHeaderCell>
                <TableHeaderCell>Koppeling</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.length === 0 ? (
                <TableEmptyRow colSpan={3}>
                  Nog geen bedrijven gekoppeld aan deze medewerker.
                </TableEmptyRow>
              ) : (
                companies.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell>
                      <CompanyLink company={company} primary />
                    </TableCell>
                    <TableCell className="text-fg-muted">
                      {company.city || "—"}
                    </TableCell>
                    <TableCell>
                      {company.ownerUserId === user.id ? (
                        <Badge tone="info">Eigenaar</Badge>
                      ) : (
                        <span className="text-fg-muted">Via lead</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </section>
    </div>
  );
}
