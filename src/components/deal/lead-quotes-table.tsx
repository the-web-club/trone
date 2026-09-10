import Link from "next/link";
import { DetailSection } from "@/components/detail/detail-layout";
import { Badge } from "@/components/ui/badge";
import {
  CompactRecordList,
  CompactRecordRow,
  ResponsiveListView,
} from "@/components/ui/responsive-list";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHeader,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
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

function OrderLinks({
  orders,
}: {
  orders: LeadQuoteRow["orders"];
}) {
  return (
    <span className="relative z-10 flex flex-wrap gap-x-2 gap-y-0.5">
      {orders.map((order) => (
        <Link
          key={order.id}
          href={orderPath(order)}
          className="text-fg hover:underline"
        >
          {order.orderNumber}
          <span className="ml-1 text-fg-muted">
            {orderStatusLabels[order.status]}
          </span>
        </Link>
      ))}
    </span>
  );
}

function quoteMeta(quote: LeadQuoteRow) {
  const parts = [
    formatEuroExact(quote.total),
    formatDate(new Date(quote.createdAt)),
  ];
  return parts.filter(Boolean).join(" · ");
}

export function LeadQuotesTable({ quotes }: { quotes: LeadQuoteRow[] }) {
  if (quotes.length === 0) return null;

  const desktop = (
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
                  <OrderLinks orders={quote.orders} />
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const mobile = (
    <CompactRecordList>
      {quotes.map((quote) => (
        <CompactRecordRow
          key={quote.id}
          href={quotePath(quote)}
          title={quote.quoteNumber}
          status={
            <Badge tone={quoteStatusTones[quote.status]}>
              {quoteStatusLabels[quote.status]}
            </Badge>
          }
          meta={quoteMeta(quote)}
        >
          {quote.orders.length > 0 ? (
            <OrderLinks orders={quote.orders} />
          ) : null}
        </CompactRecordRow>
      ))}
    </CompactRecordList>
  );

  return (
    <DetailSection title="Offertes en orders">
      <ResponsiveListView desktop={desktop} mobile={mobile} />
    </DetailSection>
  );
}
