import { CompanyOwnerSelect } from "@/components/company/company-owner-select";
import { CompanyLink } from "@/components/entity-links";
import {
  ListCard,
  ListCardContext,
  ListCardControl,
  ListCardEmpty,
  ListCardFooter,
  ListCardSignals,
  ListCardTitle,
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
import type { DealTeamMember } from "@/lib/deal-service";
import { formatIndustrySector } from "@/lib/classification";
import { countryLabel, joinMeta, listSummary } from "@/lib/list-copy";
import { companyPath } from "@/lib/paths";

export type CompanyListRow = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  country: string | null;
  ownerUserId: string | null;
  industryCode?: string | null;
  sectorCode?: string | null;
  _count: { contacts: number; deals: number };
};

export function CompaniesList({
  items,
  members,
  ownerNames,
  ownerImages,
  emptyMessage,
  emptyAction,
}: {
  items: CompanyListRow[];
  members: DealTeamMember[];
  ownerNames: Map<string, string | null | undefined>;
  ownerImages: Map<string, string | null | undefined>;
  emptyMessage: React.ReactNode;
  emptyAction?: React.ReactNode;
}) {
  const desktop = (
    <TableContainer>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHeaderCell>Naam</TableHeaderCell>
            <TableHeaderCell>Plaats</TableHeaderCell>
            <TableHeaderCell>Land</TableHeaderCell>
            <TableHeaderCell>Eigenaar</TableHeaderCell>
            <TableHeaderCell align="right">Leads</TableHeaderCell>
            <TableHeaderCell align="right">Contacten</TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableEmptyRow colSpan={6}>
              {emptyMessage}
              {emptyAction}
            </TableEmptyRow>
          ) : (
            items.map((company) => (
              <TableRow key={company.id} interactive>
                <TableCell>
                  <CompanyLink company={company} primary />
                  {formatIndustrySector(company.industryCode, company.sectorCode) ? (
                    <p className="mt-0.5 text-xs text-fg-muted">
                      {formatIndustrySector(company.industryCode, company.sectorCode)}
                    </p>
                  ) : null}
                </TableCell>
                <TableCell className="text-fg-muted">
                  {company.city || "—"}
                </TableCell>
                <TableCell className="text-fg-muted">
                  {company.country ? countryLabel(company.country) : "—"}
                </TableCell>
                <TableCell>
                  <CompanyOwnerSelect
                    companyId={company.id}
                    ownerUserId={company.ownerUserId}
                    ownerName={
                      company.ownerUserId
                        ? (ownerNames.get(company.ownerUserId) ?? null)
                        : null
                    }
                    ownerImage={
                      company.ownerUserId
                        ? (ownerImages.get(company.ownerUserId) ?? null)
                        : null
                    }
                    members={members}
                  />
                </TableCell>
                <TableCell align="right" className="text-fg-muted">
                  {company._count.deals}
                </TableCell>
                <TableCell align="right" className="text-fg-muted">
                  {company._count.contacts}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const mobile =
    items.length === 0 ? (
      <ListCardEmpty>
        {emptyMessage}
        {emptyAction}
      </ListCardEmpty>
    ) : (
      items.map((company) => {
        const context = joinMeta([
          formatIndustrySector(company.industryCode, company.sectorCode),
          company.city,
          company.country ? countryLabel(company.country) : null,
        ]);

        return (
          <ListCard key={company.id} interactive>
            <ListCardTitle href={companyPath(company)}>
              {company.name}
            </ListCardTitle>
            {context ? <ListCardContext>{context}</ListCardContext> : null}
            <ListCardSignals>
              <span className="text-sm text-fg-muted">
                {listSummary(company._count.deals, "lead", "leads")}
              </span>
              <span className="text-sm text-fg-muted">
                {listSummary(company._count.contacts, "contact", "contacten")}
              </span>
            </ListCardSignals>
            <ListCardFooter>
              <ListCardControl className="min-w-0 flex-1">
                <CompanyOwnerSelect
                  companyId={company.id}
                  ownerUserId={company.ownerUserId}
                  ownerName={
                    company.ownerUserId
                      ? (ownerNames.get(company.ownerUserId) ?? null)
                      : null
                  }
                  ownerImage={
                    company.ownerUserId
                      ? (ownerImages.get(company.ownerUserId) ?? null)
                      : null
                  }
                  members={members}
                />
              </ListCardControl>
            </ListCardFooter>
          </ListCard>
        );
      })
    );

  return <ResponsiveListView desktop={desktop} mobile={mobile} />;
}
