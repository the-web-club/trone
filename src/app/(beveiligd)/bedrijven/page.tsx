import type { Metadata } from "next";
import Link from "next/link";
import { CompaniesFilters } from "@/components/company/companies-filters";
import { CompaniesList } from "@/components/company/companies-list";
import { ListBody, ListBrowser } from "@/components/list/list-browser";
import { ListPagination } from "@/components/list/list-pagination";
import {
  PageHeader,
  pageActionPrimaryClassName,
} from "@/components/shell/page-header";
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
import { listSummary } from "@/lib/list-copy";

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
        <CompaniesList
          items={result.items}
          members={members}
          ownerNames={ownerNames}
          ownerImages={ownerImages}
          emptyMessage={emptyMessage}
          emptyAction={
            !hasFilters ? (
              <>
                {" "}
                <Link href="/bedrijven/nieuw" className="text-fg hover:underline">
                  Nieuw bedrijf
                </Link>
              </>
            ) : undefined
          }
        />
        <ListPagination
          page={parsed.pagina}
          totalPages={totalPages}
          hrefForPage={(pagina) => buildCompaniesHref({ ...parsed, pagina })}
        />
      </ListBody>
    </ListBrowser>
  );
}
