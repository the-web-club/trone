import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
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
import { listOrdersOverview } from "@/lib/worklog-service";

export const metadata: Metadata = { title: "Orders" };

const orderStatusLabels: Record<string, string> = {
  NEW: "Nieuw",
  CONFIRMED: "Bevestigd",
  IN_PRODUCTION: "In productie",
  READY: "Gereed",
  SHIPPED: "Verzonden",
  DELIVERED: "Geleverd",
  CANCELLED: "Geannuleerd",
};

export default async function OrdersPage() {
  const orders = await listOrdersOverview();

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div className="page-header-copy">
          <h1 className="page-header-title">Orders</h1>
          <p className="page-header-description">
            Bestaande orders. Log werkzaamheden vanuit de order of het logboek.
          </p>
        </div>
      </header>

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
            {orders.length === 0 ? (
              <TableEmptyRow colSpan={4}>
                Nog geen orders.
              </TableEmptyRow>
            ) : (
              orders.map((order) => (
                <TableRow key={order.id} interactive>
                  <TableCell>
                    <Link
                      href={`/orders/${order.id}`}
                      className="font-medium text-fg hover:underline"
                    >
                      {order.orderNumber}
                    </Link>
                  </TableCell>
                  <TableCell className="text-fg-muted">
                    {order.company.name}
                  </TableCell>
                  <TableCell>
                    <Badge>
                      {orderStatusLabels[order.status] ?? order.status}
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
    </div>
  );
}
