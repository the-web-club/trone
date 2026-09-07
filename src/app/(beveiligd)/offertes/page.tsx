import type { Metadata } from "next";
import Link from "next/link";
import type { QuoteStatus } from "@/generated/prisma/client";
import { ListBody, ListBrowser } from "@/components/list/list-browser";
import { ListPagination } from "@/components/list/list-pagination";
import { QuotesFilters } from "@/components/quote/quotes-filters";
import {
  PageHeader,
  pageActionPrimaryClassName,
} from "@/components/shell/page-header";
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
import { listCompaniesForSelect } from "@/lib/company-service";
import { formatDate, formatEuroExact } from "@/lib/format";
import { listSummary } from "@/lib/list-copy";
import { listQuoteRows } from "@/lib/quote-service";
import { quoteStatusLabels, quoteStatusTones } from "@/lib/quote-validation";
import { formatQuoteVersionNumber } from "@/lib/quote-version";
import { CompanyLink, ContactLink } from "@/components/entity-links";
import { quotePath } from "@/lib/paths";
import { buildQuotesHref, parseQuotesSearchParams } from "@/lib/quotes-query";

export const metadata: Metadata = { title: "Offertes" };

export default async function OffertesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const parsed = parseQuotesSearchParams(await searchParams);
  const hasFilters = Boolean(
    parsed.zoeken || parsed.status || parsed.klant || parsed.van || parsed.tot,
  );

  const [result, companies] = await Promise.all([
    listQuoteRows({
      query: parsed.zoeken || undefined,
      status: (parsed.status || undefined) as QuoteStatus | undefined,
      companyId: parsed.klant || undefined,
      van: parsed.van || undefined,
      tot: parsed.tot || undefined,
      page: parsed.pagina,
    }),
    listCompaniesForSelect(),
  ]);

  const totalPages = Math.max(Math.ceil(result.total / result.pageSize), 1);
  const emptyMessage = hasFilters
    ? "Geen offertes gevonden voor deze filters."
    : "Nog geen offertes. Stel de eerste samen.";

  return (
    <ListBrowser>
      <PageHeader
        title="Offertes"
        description="Samenstellen met live prijs. De server herberekent het bindende bedrag bij opslaan."
        meta={[
          result.total === 0 && hasFilters
            ? "Geen resultaten"
            : listSummary(result.total, "offerte", "offertes"),
        ]}
        actions={
          <Link href="/offertes/nieuw" className={pageActionPrimaryClassName()}>
            Nieuwe offerte
          </Link>
        }
      />
      <QuotesFilters
        values={parsed}
        companies={companies.map((company) => ({
          id: company.id,
          name: company.name,
        }))}
      />
      <ListBody>
        <TableContainer>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHeaderCell>Nummer</TableHeaderCell>
                <TableHeaderCell>Versie</TableHeaderCell>
                <TableHeaderCell>Klant</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell align="right">Totaal excl. btw</TableHeaderCell>
                <TableHeaderCell>Datum</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.items.length === 0 ? (
                <TableEmptyRow colSpan={6}>
                  {emptyMessage}
                  {!hasFilters ? (
                    <>
                      {" "}
                      <Link href="/offertes/nieuw" className="text-fg hover:underline">
                        Nieuwe offerte
                      </Link>
                    </>
                  ) : null}
                </TableEmptyRow>
              ) : (
                result.items.map((quote) => (
                  <TableRow key={quote.id} interactive>
                    <TableCell>
                      <Link
                        href={quotePath(quote)}
                        className="font-medium text-fg hover:underline"
                      >
                        {quote.quoteNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="text-fg-muted">
                      {quote.currentVersionNumber > 0
                        ? formatQuoteVersionNumber(
                            quote.quoteNumber,
                            quote.currentVersionNumber,
                          )
                        : "Concept"}
                    </TableCell>
                    <TableCell className="text-fg-muted">
                      <CompanyLink company={quote.company} />
                      {quote.contact ? (
                        <>
                          {" · "}
                          <ContactLink contact={quote.contact} />
                        </>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Badge tone={quoteStatusTones[quote.status]}>
                        {quoteStatusLabels[quote.status]}
                      </Badge>
                    </TableCell>
                    <TableCell align="right">
                      {formatEuroExact(Number(quote.total))}
                    </TableCell>
                    <TableCell className="text-fg-muted">
                      {formatDate(quote.createdAt)}
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
          hrefForPage={(pagina) => buildQuotesHref({ ...parsed, pagina })}
        />
      </ListBody>
    </ListBrowser>
  );
}
