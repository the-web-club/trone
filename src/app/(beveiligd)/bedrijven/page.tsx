import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export const metadata: Metadata = { title: "Bedrijven" };

export default async function BedrijvenPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const companies = await listCompanies(query || undefined);

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div className="page-header-copy">
          <h1 className="page-header-title">Bedrijven</h1>
          <p className="page-header-description">
            Klanten en prospects. Contacten, leads en offertes hangen hieraan.
          </p>
        </div>
        <div className="page-actions">
          <Link
            href="/bedrijven/nieuw"
            className="inline-flex h-8 items-center rounded-sm bg-accent px-3 text-sm font-medium text-accent-fg shadow-[var(--shadow-xs)] hover:bg-accent-hover"
          >
            Nieuw bedrijf
          </Link>
        </div>
      </header>

      <form method="get" className="flex max-w-sm gap-2">
        <Input
          name="q"
          type="search"
          placeholder="Zoek op naam"
          defaultValue={query}
          aria-label="Zoek bedrijven"
        />
        <Button type="submit" variant="secondary">
          Zoeken
        </Button>
      </form>

      <TableContainer>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHeaderCell>Naam</TableHeaderCell>
              <TableHeaderCell>Plaats</TableHeaderCell>
              <TableHeaderCell align="right">Contacten</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies.length === 0 ? (
              <TableEmptyRow colSpan={3}>
                {query
                  ? "Geen bedrijven gevonden voor deze zoekopdracht."
                  : "Nog geen bedrijven. Voeg het eerste bedrijf toe."}
              </TableEmptyRow>
            ) : (
              companies.map((company) => (
                <TableRow key={company.id} interactive>
                  <TableCell>
                    <Link
                      href={`/bedrijven/${company.id}`}
                      className="font-medium text-fg hover:underline"
                    >
                      {company.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-fg-muted">
                    {company.city || "—"}
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
    </div>
  );
}
