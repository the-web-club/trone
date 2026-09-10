import Link from "next/link";
import { CompanyLink, ContactLink } from "@/components/entity-links";
import { Badge } from "@/components/ui/badge";
import {
  ListCard,
  ListCardEmpty,
  ListCardHeader,
  ListCardMeta,
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
import { formatDate, formatEuroExact } from "@/lib/format";
import { quotePath } from "@/lib/paths";
import { quoteStatusLabels, quoteStatusTones } from "@/lib/quote-validation";
import { formatQuoteVersionNumber } from "@/lib/quote-version";
import type { QuoteStatusInput } from "@/lib/quote-validation";

export type QuoteListRow = {
  id: string;
  quoteNumber: string;
  currentVersionNumber: number;
  company: { slug: string; name: string } | null;
  contact: {
    slug: string;
    firstName: string;
    lastName: string | null;
  } | null;
  status: QuoteStatusInput;
  total: { toString(): string } | number | string;
  createdAt: Date;
};

export function QuotesList({
  items,
  emptyMessage,
  emptyAction,
}: {
  items: QuoteListRow[];
  emptyMessage: React.ReactNode;
  emptyAction?: React.ReactNode;
}) {
  const desktop = (
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
          {items.length === 0 ? (
            <TableEmptyRow colSpan={6}>
              {emptyMessage}
              {emptyAction}
            </TableEmptyRow>
          ) : (
            items.map((quote) => (
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
  );

  const mobile =
    items.length === 0 ? (
      <ListCardEmpty>
        {emptyMessage}
        {emptyAction}
      </ListCardEmpty>
    ) : (
      items.map((quote) => (
        <ListCard key={quote.id}>
          <ListCardHeader>
            <div className="min-w-0">
              <ListCardTitle>
                <Link
                  href={quotePath(quote)}
                  className="hover:underline"
                >
                  {quote.quoteNumber}
                </Link>
              </ListCardTitle>
              <ListCardMeta>
                {quote.currentVersionNumber > 0
                  ? formatQuoteVersionNumber(
                      quote.quoteNumber,
                      quote.currentVersionNumber,
                    )
                  : "Concept"}
              </ListCardMeta>
            </div>
            <Badge tone={quoteStatusTones[quote.status]}>
              {quoteStatusLabels[quote.status]}
            </Badge>
          </ListCardHeader>
          <ListCardRows>
            <ListCardRow label="Klant">
              <CompanyLink company={quote.company} />
              {quote.contact ? (
                <>
                  {" · "}
                  <ContactLink contact={quote.contact} />
                </>
              ) : null}
            </ListCardRow>
            <ListCardRow label="Totaal">
              {formatEuroExact(Number(quote.total))}
            </ListCardRow>
            <ListCardRow label="Datum">
              {formatDate(quote.createdAt)}
            </ListCardRow>
          </ListCardRows>
        </ListCard>
      ))
    );

  return <ResponsiveListView desktop={desktop} mobile={mobile} />;
}
