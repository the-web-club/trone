import type { Metadata } from "next";
import Link from "next/link";
import { CompaniesFilters } from "@/components/company/companies-filters";
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
import {
  listCompanyCities,
  listCompanyCountries,
  listCompanyRows,
} from "@/lib/company-service";
import {
  buildCompaniesHref,
  parseCompaniesSearchParams,
} from "@/lib/companies-query";
import { countryLabel, listSummary } from "@/lib/list-copy";
import { CompanyLink } from "@/components/entity-links";

export const metadata: Metadata = { title: "Bedrijven" };

export default async function BedrijvenPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const parsed = parseCompaniesSearchParams(await searchParams);
  const hasFilters = Boolean(parsed.zoeken || parsed.plaats || parsed.land);

  const [result, cities, countries] = await Promise.all([
    listCompanyRows({
      query: parsed.zoeken || undefined,
      city: parsed.plaats || undefined,
      country: parsed.land || undefined,
      page: parsed.pagina,
    }),
    listCompanyCities(),
    listCompanyCountries(),
  ]);

  const totalPages = Math.max(Math.ceil(result.total / result.pageSize), 1);
  const emptyMessage = hasFilters
    ? "Geen bedrijven gevonden voor deze filters."
    : "Nog geen bedrijven. Voeg het eerste bedrijf toe.";

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
      />
      <ListBody>
        <TableContainer>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHeaderCell>Naam</TableHeaderCell>
                <TableHeaderCell>Plaats</TableHeaderCell>
                <TableHeaderCell>Land</TableHeaderCell>
                <TableHeaderCell align="right">Contacten</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.items.length === 0 ? (
                <TableEmptyRow colSpan={4}>
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
