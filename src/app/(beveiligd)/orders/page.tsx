import type { Metadata } from "next";
import Link from "next/link";
import type { OrderStatus } from "@/generated/prisma/client";
import { ListBody, ListBrowser } from "@/components/list/list-browser";
import { ListPagination } from "@/components/list/list-pagination";
import { OrdersFilters } from "@/components/order/orders-filters";
import { PageHeader } from "@/components/shell/page-header";
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
import { listCompanies } from "@/lib/company-service";
import { formatDate } from "@/lib/format";
import { listSummary } from "@/lib/list-copy";
import { listOrders } from "@/lib/order-service";
import {
  buildOrdersHref,
  orderStatusLabels,
  orderStatusTones,
  parseOrdersSearchParams,
} from "@/lib/orders-query";

export const metadata: Metadata = { title: "Orders" };

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const parsed = parseOrdersSearchParams(await searchParams);
  const hasFilters = Boolean(
    parsed.zoeken || parsed.status || parsed.klant || parsed.van || parsed.tot,
  );

  const [result, companies] = await Promise.all([
    listOrders({
      query: parsed.zoeken || undefined,
      status: (parsed.status || undefined) as OrderStatus | undefined,
      companyId: parsed.klant || undefined,
      van: parsed.van || undefined,
      tot: parsed.tot || undefined,
      page: parsed.pagina,
    }),
    listCompanies(),
  ]);

  const totalPages = Math.max(Math.ceil(result.total / result.pageSize), 1);
  const emptyMessage = hasFilters
    ? "Geen orders gevonden voor deze filters."
    : "Nog geen orders.";

  return (
    <ListBrowser>
      <PageHeader
        title="Orders"
        description="Productieorders. Filter via de URL; open een order voor de details."
        meta={[
          result.total === 0 && hasFilters
            ? "Geen resultaten"
            : listSummary(result.total, "order", "orders"),
        ]}
      />
      <OrdersFilters
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
                <TableHeaderCell>Nummer</TableHeaderCell>
                <TableHeaderCell>Klant</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Datum</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.items.length === 0 ? (
                <TableEmptyRow colSpan={4}>{emptyMessage}</TableEmptyRow>
              ) : (
                result.items.map((order) => (
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
        <ListPagination
          page={parsed.pagina}
          totalPages={totalPages}
          hrefForPage={(pagina) => buildOrdersHref({ ...parsed, pagina })}
        />
      </ListBody>
    </ListBrowser>
  );
}
