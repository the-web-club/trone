import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { DealHotIcon } from "@/components/deal/deal-hot-icon";
import { DealStagePill } from "@/components/deal/deal-stage-pill";
import {
  DetailBackLink,
  DetailHeader,
  DetailMetaRow,
  DetailPage,
  DetailSection,
} from "@/components/detail/detail-layout";
import { CompanyLink, ContactLink, DealLink } from "@/components/entity-links";
import { StaffAvatarEditor } from "@/components/settings/staff-avatar-editor";
import { Badge } from "@/components/ui/badge";
import {
  CompactRecordList,
  CompactRecordRow,
  ListCardEmpty,
  ResponsiveListView,
} from "@/components/ui/responsive-list";
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
import { companyPath, dealPath, staffPath } from "@/lib/paths";
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
    return { title: "Teamlid" };
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

  const dealsDesktop = (
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
              Nog geen leads gekoppeld aan dit teamlid.
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
  );

  const dealsMobile =
    deals.length === 0 ? (
      <ListCardEmpty>
        Nog geen leads gekoppeld aan dit teamlid.
      </ListCardEmpty>
    ) : (
      <CompactRecordList>
        {deals.map((deal) => (
          <CompactRecordRow
            key={deal.id}
            href={dealPath(deal)}
            title={
              <span className="inline-flex min-w-0 items-center gap-1">
                {deal.title}
                {deal.isHot ? <DealHotIcon /> : null}
              </span>
            }
            status={
              <DealStagePill
                name={deal.stage.name}
                isWon={deal.stage.isWon}
                isLost={deal.stage.isLost}
              />
            }
            meta={[
              deal.company?.name,
              deal.contact
                ? [deal.contact.firstName, deal.contact.lastName]
                    .filter(Boolean)
                    .join(" ")
                : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          />
        ))}
      </CompactRecordList>
    );

  const companiesDesktop = (
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
              Nog geen bedrijven gekoppeld aan dit teamlid.
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
  );

  const companiesMobile =
    companies.length === 0 ? (
      <ListCardEmpty>
        Nog geen bedrijven gekoppeld aan dit teamlid.
      </ListCardEmpty>
    ) : (
      <CompactRecordList>
        {companies.map((company) => (
          <CompactRecordRow
            key={company.id}
            href={companyPath(company)}
            title={company.name}
            status={
              company.ownerUserId === user.id ? (
                <Badge tone="info">Eigenaar</Badge>
              ) : null
            }
            meta={company.city || undefined}
          />
        ))}
      </CompactRecordList>
    );

  return (
    <DetailPage>
      <DetailHeader
        back={
          <DetailBackLink href="/instellingen/medewerkers">
            Teamleden
          </DetailBackLink>
        }
        title={
          <div className="flex min-w-0 items-start gap-3">
            <StaffAvatarEditor
              userId={user.id}
              name={user.name}
              image={user.image}
              canEdit={canEditAvatar}
            />
            <h1 className="page-header-title min-w-0 pt-0.5">{user.name}</h1>
          </div>
        }
        status={<Badge tone={status.tone}>{status.label}</Badge>}
        meta={
          <DetailMetaRow
            items={[
              user.email,
              role ? userRoleLabels[role] : user.role,
              isSelf ? "Jij" : null,
            ]}
          />
        }
      />

      <DetailSection title="Leads">
        <ResponsiveListView desktop={dealsDesktop} mobile={dealsMobile} />
      </DetailSection>

      <DetailSection title="Bedrijven">
        <ResponsiveListView
          desktop={companiesDesktop}
          mobile={companiesMobile}
        />
      </DetailSection>
    </DetailPage>
  );
}
