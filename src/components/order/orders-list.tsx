import Link from "next/link";
import { CompanyLink } from "@/components/entity-links";
import { Badge } from "@/components/ui/badge";
import {
  ListCard,
  ListCardContext,
  ListCardDate,
  ListCardEmpty,
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
import { formatDate } from "@/lib/format";
import { orderPath } from "@/lib/paths";
import {
  orderStatusLabels,
  orderStatusTones,
} from "@/lib/orders-query";
import type { OrderStatus } from "@/generated/prisma/client";

export type OrderListRow = {
  id: string;
  orderNumber: string;
  company: { slug: string; name: string } | null;
  status: OrderStatus;
  createdAt: Date;
};

export function OrdersList({
  items,
  emptyMessage,
}: {
  items: OrderListRow[];
  emptyMessage: React.ReactNode;
}) {
  const desktop = (
    <TableContainer>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHeaderCell>Nummer</TableHeaderCell>
            <TableHeaderCell>Klant</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell>Datum</TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableEmptyRow colSpan={4}>{emptyMessage}</TableEmptyRow>
          ) : (
            items.map((order) => (
              <TableRow key={order.id} interactive>
                <TableCell>
                  <Link
                    href={orderPath(order)}
                    className="font-medium text-fg hover:underline"
                  >
                    {order.orderNumber}
                  </Link>
                </TableCell>
                <TableCell className="text-fg-muted">
                  <CompanyLink company={order.company} />
                </TableCell>
                <TableCell>
                  <Badge tone={orderStatusTones[order.status]}>
                    {orderStatusLabels[order.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-fg-muted">
                  {formatDate(order.createdAt)}
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
      <ListCardEmpty>{emptyMessage}</ListCardEmpty>
    ) : (
      items.map((order) => (
        <ListCard key={order.id} interactive>
          <ListCardTitle href={orderPath(order)}>
            {order.orderNumber}
          </ListCardTitle>
          {order.company ? (
            <ListCardContext>{order.company.name}</ListCardContext>
          ) : null}
          <ListCardSignals>
            <Badge
              tone={orderStatusTones[order.status]}
              className="h-auto min-h-5 max-w-full whitespace-normal"
            >
              {orderStatusLabels[order.status]}
            </Badge>
          </ListCardSignals>
          <ListCardFooter className="justify-end">
            <ListCardDate>{formatDate(order.createdAt)}</ListCardDate>
          </ListCardFooter>
        </ListCard>
      ))
    );

  return <ResponsiveListView desktop={desktop} mobile={mobile} />;
}
