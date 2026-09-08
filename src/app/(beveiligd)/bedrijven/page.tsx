import type { Metadata } from "next";
import Link from "next/link";
import { CompaniesFilters } from "@/components/company/companies-filters";
import { CompanyOwnerSelect } from "@/components/company/company-owner-select";
import { ListBody, ListBrowser } from "@/components/list/list-browser";
import { ListPagination } from "@/components/list/list-pagination";
import {
  PageHeader,
  pageActionPrimaryClassName,
} from "@/components/shell/page-header";
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
import { requireSession } from "@/lib/auth-session";
import {
  getCompanyOwnerFacets,
  listCompanyCities,
  listCompanyCountries,
  listCompanyRows,
} from "@/lib/company-service";
import {
  buildCompaniesHref,
  parseCompaniesSearchParams,
} from "@/lib/companies-query";
import { listDealTeamMembers } from "@/lib/deal-service";
import { countryLabel, listSummary } from "@/lib/list-copy";
import { CompanyLink } from "@/components/entity-links";

export const metadata: Metadata = { title: "Bedrijven" };

export default async function BedrijvenPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireSession();
  const parsed = parseCompaniesSearchParams(await searchParams);
  const currentUserId = session.user.id;
  const listFilters = {
    query: parsed.zoeken || undefined,
    city: parsed.plaats || undefined,
    country: parsed.land || undefined,
    eigenaar: parsed.eigenaar,
    page: parsed.pagina,
  };
  const hasFilters = Boolean(
    parsed.zoeken || parsed.plaats || parsed.land || parsed.eigenaar !== "alle",
  );

  const [result, cities, countries, members, facets] = await Promise.all([
    listCompanyRows(listFilters, currentUserId),
    listCompanyCities(),
    listCompanyCountries(),
    listDealTeamMembers(),
    getCompanyOwnerFacets(listFilters, currentUserId),
  ]);

  const ownerNames = new Map(
    members.map((member) => [member.id, member.name || member.email]),
  );
  const ownerImages = new Map(
    members.map((member) => [member.id, member.image]),
  );

  const totalPages = Math.max(Math.ceil(result.total / result.pageSize), 1);
  let emptyMessage = "Nog geen bedrijven. Voeg het eerste bedrijf toe.";
  if (result.total === 0 && hasFilters) {
    if (
      parsed.eigenaar === "aan-mij" &&
      !parsed.zoeken &&
      !parsed.plaats &&
      !parsed.land
    ) {
      emptyMessage = "Geen bedrijven aan jou toegewezen.";
    } else {
      emptyMessage = "Geen bedrijven gevonden voor deze filters.";
    }
  }

  return (
    <ListBrowser>
      <PageHeader
        title="Bedrijven"
        description="Klanten en prospects. Contacten, leads en offertes hangen hieraan."
        meta={[
          result.total === 0 && hasFilters
            ? "Geen resultaten"
            : listSummary(result.total, "bedrijf", "bedrijven"),
        ]}
        actions={
          <Link href="/bedrijven/nieuw" className={pageActionPrimaryClassName()}>
            Nieuw bedrijf
          </Link>
        }
      />
      <CompaniesFilters
        values={parsed}
        cities={cities}
        countries={countries}
        members={members}
        facets={facets}
      />
      <ListBody>
        <TableContainer>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHeaderCell>Naam</TableHeaderCell>
                <TableHeaderCell>Plaats</TableHeaderCell>
                <TableHeaderCell>Land</TableHeaderCell>
                <TableHeaderCell>Eigenaar</TableHeaderCell>
                <TableHeaderCell align="right">Contacten</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.items.length === 0 ? (
                <TableEmptyRow colSpan={5}>
                  {emptyMessage}
                  {!hasFilters ? (
                    <>
                      {" "}
                      <Link href="/bedrijven/nieuw" className="text-fg hover:underline">
                        Nieuw bedrijf
                      </Link>
                    </>
                  ) : null}
                </TableEmptyRow>
              ) : (
                result.items.map((company) => (
                  <TableRow key={company.id} interactive>
                    <TableCell>
                      <CompanyLink company={company} primary />
                    </TableCell>
                    <TableCell className="text-fg-muted">
                      {company.city || "—"}
                    </TableCell>
                    <TableCell className="text-fg-muted">
                      {countryLabel(company.country)}
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
                      {company._count.contacts}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <ListPagination
          page={parsed.pagina}
          totalPages={totalPages}
          hrefForPage={(pagina) => buildCompaniesHref({ ...parsed, pagina })}
        />
      </ListBody>
    </ListBrowser>
  );
}
