import type { Metadata } from "next";
import Link from "next/link";
import { ContactsFilters } from "@/components/contact/contacts-filters";
import { ListBody, ListBrowser } from "@/components/list/list-browser";
import { ListPagination } from "@/components/list/list-pagination";
import {
  PageHeader,
  pageActionSecondaryClassName,
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
import { listCompanies } from "@/lib/company-service";
import { listContactRows } from "@/lib/contact-service";
import {
  buildContactsHref,
  parseContactsSearchParams,
} from "@/lib/contacts-query";
import { listSummary } from "@/lib/list-copy";
import { CompanyLink, ContactLink } from "@/components/entity-links";

export const metadata: Metadata = { title: "Contacten" };

export default async function ContactenPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const parsed = parseContactsSearchParams(await searchParams);
  const hasFilters = Boolean(parsed.zoeken || parsed.bedrijf);

  const [result, companies] = await Promise.all([
    listContactRows({
      query: parsed.zoeken || undefined,
      companyId: parsed.bedrijf || undefined,
      page: parsed.pagina,
    }),
    listCompanies(),
  ]);

  const totalPages = Math.max(Math.ceil(result.total / result.pageSize), 1);
  const emptyMessage = hasFilters
    ? "Geen contacten gevonden voor deze filters."
    : "Nog geen contacten. Voeg het eerste contact toe via een bedrijf.";

  return (
    <ListBrowser>
      <PageHeader
        title="Contacten"
        description="Personen bij klanten en prospects."
        meta={[
          result.total === 0 && hasFilters
            ? "Geen resultaten"
            : listSummary(result.total, "contact", "contacten"),
        ]}
        actions={
          <Link href="/bedrijven" className={pageActionSecondaryClassName()}>
            Naar bedrijven
          </Link>
        }
      />
      <ContactsFilters
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
                <TableHeaderCell>Naam</TableHeaderCell>
                <TableHeaderCell>E-mail</TableHeaderCell>
                <TableHeaderCell>Bedrijf</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.items.length === 0 ? (
                <TableEmptyRow colSpan={3}>
                  {emptyMessage}
                  {!hasFilters ? (
                    <>
                      {" "}
                      <Link href="/bedrijven" className="text-fg hover:underline">
                        Open bedrijven
                      </Link>
                    </>
                  ) : null}
                </TableEmptyRow>
              ) : (
                result.items.map((contact) => (
                  <TableRow key={contact.id} interactive>
                    <TableCell>
                      <ContactLink contact={contact} primary />
                    </TableCell>
                    <TableCell className="text-fg-muted">
                      {contact.email || "—"}
                    </TableCell>
                    <TableCell className="text-fg-muted">
                      <CompanyLink company={contact.company} />
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
          hrefForPage={(pagina) => buildContactsHref({ ...parsed, pagina })}
        />
      </ListBody>
    </ListBrowser>
  );
}
