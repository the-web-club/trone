import Link from "next/link";
import { CompanyLink, ContactLink } from "@/components/entity-links";
import { Badge } from "@/components/ui/badge";
import {
  ListCard,
  ListCardContext,
  ListCardDate,
  ListCardEmpty,
  ListCardFacts,
  ListCardFooter,
  ListCardSignals,
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
import { formatDate, formatEuroExact, formatPersonName } from "@/lib/format";
import { joinMeta } from "@/lib/list-copy";
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

function quoteVersionLabel(quote: QuoteListRow) {
  if (quote.currentVersionNumber > 0) {
    return formatQuoteVersionNumber(
      quote.quoteNumber,
      quote.currentVersionNumber,
    );
  }
  return "Concept";
}

function quoteVersionMeta(quote: QuoteListRow) {
  if (quote.currentVersionNumber > 0) {
    return `v${quote.currentVersionNumber}`;
  }
  return "Concept";
}

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
                  {quoteVersionLabel(quote)}
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
      items.map((quote) => {
        const context = joinMeta([
          quote.company?.name,
          quote.contact
            ? formatPersonName(quote.contact.firstName, quote.contact.lastName)
            : null,
        ]);

        return (
          <ListCard key={quote.id} interactive>
            <ListCardTitle href={quotePath(quote)}>
              {quote.quoteNumber}
            </ListCardTitle>
            {context ? <ListCardContext>{context}</ListCardContext> : null}
            <ListCardSignals>
              <Badge
                tone={quoteStatusTones[quote.status]}
                className="h-auto min-h-5 max-w-full whitespace-normal"
              >
                {quoteStatusLabels[quote.status]}
              </Badge>
            </ListCardSignals>
            <ListCardFacts>
              <span className="tabular-nums text-fg">
                {formatEuroExact(Number(quote.total))}
              </span>
              <span>{quoteVersionMeta(quote)}</span>
            </ListCardFacts>
            <ListCardFooter className="justify-end">
              <ListCardDate>{formatDate(quote.createdAt)}</ListCardDate>
            </ListCardFooter>
          </ListCard>
        );
      })
    );

  return <ResponsiveListView desktop={desktop} mobile={mobile} />;
}
