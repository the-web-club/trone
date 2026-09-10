import { CompanyOwnerSelect } from "@/components/company/company-owner-select";
import { CompanyLink } from "@/components/entity-links";
import {
  ListCard,
  ListCardEmpty,
  ListCardHeader,
  ListCardRow,
  ListCardRows,
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
import { countryLabel } from "@/lib/list-copy";

export type CompanyListRow = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  country: string | null;
  ownerUserId: string | null;
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
      items.map((company) => (
        <ListCard key={company.id}>
          <ListCardHeader>
            <ListCardTitle>
              <CompanyLink company={company} primary />
            </ListCardTitle>
          </ListCardHeader>
          <ListCardRows>
            <ListCardRow label="Plaats">{company.city || "—"}</ListCardRow>
            <ListCardRow label="Land">
              {company.country ? countryLabel(company.country) : "—"}
            </ListCardRow>
            <ListCardRow label="Eigenaar">
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
            </ListCardRow>
            <ListCardRow label="Leads">{company._count.deals}</ListCardRow>
            <ListCardRow label="Contacten">{company._count.contacts}</ListCardRow>
          </ListCardRows>
        </ListCard>
      ))
    );

  return <ResponsiveListView desktop={desktop} mobile={mobile} />;
}
