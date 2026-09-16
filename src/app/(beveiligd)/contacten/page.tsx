import type { Metadata } from "next";
import { ContactsFilters } from "@/components/contact/contacts-filters";
import { ContactsList } from "@/components/contact/contacts-list";
import { CreateContactListDialog } from "@/components/contact/create-contact-list-dialog";
import { ListBody, ListBrowser } from "@/components/list/list-browser";
import { ListPagination } from "@/components/list/list-pagination";
import { PageHeader, PageHeaderNavLink } from "@/components/shell/page-header";
import { requireSession } from "@/lib/auth-session";
import { searchCompaniesForSelect } from "@/lib/company-service";
import { getContactFilterFacets, listContactRows } from "@/lib/contact-service";
import {
  buildContactsHref,
  parseContactsSearchParams,
} from "@/lib/contacts-query";
import { listDealTeamMembers } from "@/lib/deal-service";
import { listSummary } from "@/lib/list-copy";

export const metadata: Metadata = { title: "Contacten" };

export default async function ContactenPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireSession();
  const parsed = parseContactsSearchParams(await searchParams);
  const currentUserId = session.user.id;
  const listFilters = {
    query: parsed.zoeken || undefined,
    companyId: parsed.bedrijf || undefined,
    eigenaar: parsed.eigenaar,
    industries: parsed.branche ?? [],
    sectors: parsed.sector ?? [],
    applications: parsed.toepassing ?? [],
    page: parsed.pagina,
  };
  const hasFilters = Boolean(
    parsed.zoeken ||
      parsed.bedrijf ||
      parsed.eigenaar !== "alle" ||
      (parsed.branche ?? []).length > 0 ||
      (parsed.sector ?? []).length > 0 ||
      (parsed.toepassing ?? []).length > 0,
  );

  // Bedrijfsopties voor de dialogen zijn begrensd; de combobox zoekt
  // server-side verder. `parsed.bedrijf` blijft erbij zodat het actieve
  // filter zijn naam houdt.
  const [result, companies, members, facets] = await Promise.all([
    listContactRows(listFilters, currentUserId),
    searchCompaniesForSelect({
      includeIds: parsed.bedrijf ? [parsed.bedrijf] : undefined,
    }),
    listDealTeamMembers(),
    getContactFilterFacets(listFilters, currentUserId),
  ]);

  const selectedCompanyName = parsed.bedrijf
    ? (companies.find((company) => company.id === parsed.bedrijf)?.name ?? null)
    : null;

  const ownerNames = new Map(
    members.map((member) => [member.id, member.name || member.email]),
  );
  const ownerImages = new Map(
    members.map((member) => [member.id, member.image]),
  );

  const totalPages = Math.max(Math.ceil(result.total / result.pageSize), 1);
  let emptyMessage = "Nog geen contacten. Voeg het eerste contact toe.";
  if (result.total === 0 && hasFilters) {
    if (
      parsed.eigenaar === "aan-mij" &&
      !parsed.zoeken &&
      !parsed.bedrijf
    ) {
      emptyMessage = "Geen contacten aan jou toegewezen.";
    } else {
      emptyMessage = "Geen contacten gevonden voor deze filters.";
    }
  }

  return (
    <ListBrowser>
      <PageHeader
        title="Contacten"
        nav={<PageHeaderNavLink href="/bedrijven">Naar bedrijven</PageHeaderNavLink>}
        description="Personen, met of zonder koppeling aan een bedrijf."
        meta={[
          result.total === 0 && hasFilters
            ? "Geen resultaten"
            : listSummary(result.total, "contact", "contacten"),
        ]}
        actions={
          <CreateContactListDialog
            companies={companies}
            defaultCompanyId={parsed.bedrijf}
          />
        }
      />
      <ContactsFilters
        values={parsed}
        selectedCompanyName={selectedCompanyName}
        members={members}
        facets={facets}
      />
      <ListBody>
        <ContactsList
          items={result.items}
          members={members}
          ownerNames={ownerNames}
          ownerImages={ownerImages}
          emptyMessage={emptyMessage}
          emptyAction={
            !hasFilters ? (
              <>
                {" "}
                <CreateContactListDialog
                  companies={companies}
                  trigger={
                    <button type="button" className="text-fg hover:underline">
                      Nieuw contact
                    </button>
                  }
                />
              </>
            ) : undefined
          }
        />
        <ListPagination
          page={parsed.pagina}
          totalPages={totalPages}
          hrefForPage={(pagina) => buildContactsHref({ ...parsed, pagina })}
        />
      </ListBody>
    </ListBrowser>
  );
}
