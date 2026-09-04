import type { Metadata } from "next";
import Link from "next/link";
import type { QuoteStatus } from "@/generated/prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
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
import { listQuotes } from "@/lib/quote-service";
import {
  quoteStatusLabels,
  quoteStatuses,
  quoteStatusTones,
} from "@/lib/quote-validation";
import { formatDate, formatEuroExact, formatPersonName } from "@/lib/format";

export const metadata: Metadata = { title: "Offertes" };

export default async function OffertesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q, status } = await searchParams;
  const query = q?.trim() ?? "";
  const statusFilter = quoteStatuses.includes(
    status as (typeof quoteStatuses)[number],
  )
    ? (status as QuoteStatus)
    : undefined;

  const quotes = await listQuotes({
    query: query || undefined,
    status: statusFilter,
  });

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div className="page-header-copy">
          <h1 className="page-header-title">Offertes</h1>
          <p className="page-header-description">
            Samenstellen met live prijs. De server herberekent het bindende
            bedrag bij opslaan.
          </p>
        </div>
        <div className="page-actions">
          <Link
            href="/offertes/nieuw"
            className="inline-flex h-8 items-center rounded-sm bg-accent px-3 text-sm font-medium text-accent-fg shadow-[var(--shadow-xs)] hover:bg-accent-hover"
          >
            Nieuwe offerte
          </Link>
        </div>
      </header>

      <form method="get" className="flex max-w-2xl flex-wrap gap-2">
        <Input
          name="q"
          type="search"
          placeholder="Zoek op nummer of klant"
          defaultValue={query}
          aria-label="Zoek offertes"
          className="max-w-xs"
        />
        <Select name="status" defaultValue={statusFilter ?? ""} className="max-w-48" aria-label="Filter op status">
          <option value="">Alle statussen</option>
          {quoteStatuses.map((value) => (
            <option key={value} value={value}>
              {quoteStatusLabels[value]}
            </option>
          ))}
        </Select>
        <Button type="submit" variant="secondary">
          Filteren
        </Button>
      </form>

      <TableContainer>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHeaderCell>Nummer</TableHeaderCell>
              <TableHeaderCell>Klant</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell align="right">Totaal excl. btw</TableHeaderCell>
              <TableHeaderCell>Datum</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {quotes.length === 0 ? (
              <TableEmptyRow colSpan={5}>
                {query || statusFilter
                  ? "Geen offertes gevonden voor deze filters."
                  : "Nog geen offertes. Stel de eerste samen."}
              </TableEmptyRow>
            ) : (
              quotes.map((quote) => (
                <TableRow key={quote.id} interactive>
                  <TableCell>
                    <Link
                      href={`/offertes/${quote.id}`}
                      className="font-medium text-fg hover:underline"
                    >
                      {quote.quoteNumber}
                    </Link>
                  </TableCell>
                  <TableCell className="text-fg-muted">
                    {quote.company.name}
                    {quote.contact
                      ? ` · ${formatPersonName(quote.contact.firstName, quote.contact.lastName)}`
                      : ""}
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
    </div>
  );
}
