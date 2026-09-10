import type { Metadata } from "next";
import Link from "next/link";
import type { QuoteStatus } from "@/generated/prisma/client";
import { ListBody, ListBrowser } from "@/components/list/list-browser";
import { ListPagination } from "@/components/list/list-pagination";
import { QuotesFilters } from "@/components/quote/quotes-filters";
import { QuotesList } from "@/components/quote/quotes-list";
import {
  PageHeader,
  pageActionPrimaryClassName,
} from "@/components/shell/page-header";
import { listCompaniesForSelect } from "@/lib/company-service";
import { listSummary } from "@/lib/list-copy";
import { listQuoteRows } from "@/lib/quote-service";
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
        <QuotesList
          items={result.items}
          emptyMessage={emptyMessage}
          emptyAction={
            !hasFilters ? (
              <>
                {" "}
                <Link href="/offertes/nieuw" className="text-fg hover:underline">
                  Nieuwe offerte
                </Link>
              </>
            ) : undefined
          }
        />
        <ListPagination
          page={parsed.pagina}
          totalPages={totalPages}
          hrefForPage={(pagina) => buildQuotesHref({ ...parsed, pagina })}
        />
      </ListBody>
    </ListBrowser>
  );
}
