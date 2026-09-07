import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHeader,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import { DetailSection } from "@/components/detail/detail-layout";
import { formatDate, formatEuroExact } from "@/lib/format";
import { orderStatusLabels } from "@/lib/orders-query";
import { orderPath, quotePath } from "@/lib/paths";
import {
  quoteStatusLabels,
  quoteStatusTones,
} from "@/lib/quote-validation";

export type LeadQuoteRow = {
  id: string;
  quoteNumber: string;
  status: keyof typeof quoteStatusLabels;
  total: number;
  createdAt: string;
  orders: Array<{
    id: string;
    orderNumber: string;
    status: keyof typeof orderStatusLabels;
  }>;
};

export function LeadQuotesTable({ quotes }: { quotes: LeadQuoteRow[] }) {
  if (quotes.length === 0) return null;

  return (
    <DetailSection title="Offertes en orders">
      <TableContainer>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHeaderCell>Offerte</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Totaal</TableHeaderCell>
              <TableHeaderCell>Datum</TableHeaderCell>
              <TableHeaderCell>Order</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {quotes.map((quote) => (
              <TableRow key={quote.id} interactive className="relative">
                <TableCell>
                  <Link
                    href={quotePath(quote)}
                    className="font-medium text-fg after:absolute after:inset-0 hover:underline"
                  >
                    {quote.quoteNumber}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge tone={quoteStatusTones[quote.status]}>
                    {quoteStatusLabels[quote.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-fg-muted">
                  {formatEuroExact(quote.total)}
                </TableCell>
                <TableCell className="text-fg-muted">
                  {formatDate(new Date(quote.createdAt))}
                </TableCell>
                <TableCell className="relative z-10">
                  {quote.orders.length === 0 ? (
                    <span className="text-fg-muted">—</span>
                  ) : (
                    <span className="flex flex-col gap-1">
                      {quote.orders.map((order) => (
                        <Link
                          key={order.id}
                          href={orderPath(order)}
                          className="text-fg hover:underline"
                        >
                          {order.orderNumber}
                          <span className="ml-2 text-fg-muted">
                            {orderStatusLabels[order.status]}
                          </span>
                        </Link>
                      ))}
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </DetailSection>
  );
}
