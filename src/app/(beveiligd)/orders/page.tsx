import type { Metadata } from "next";
import type { OrderStatus } from "@/generated/prisma/client";
import { ListBody, ListBrowser } from "@/components/list/list-browser";
import { ListPagination } from "@/components/list/list-pagination";
import { OrdersFilters } from "@/components/order/orders-filters";
import { OrdersList } from "@/components/order/orders-list";
import { PageHeader } from "@/components/shell/page-header";
import { listSummary } from "@/lib/list-copy";
import { getOrderFilterFacets, listOrders } from "@/lib/order-service";
import { buildOrdersHref, parseOrdersSearchParams } from "@/lib/orders-query";

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

  // Klantopties komen uit het facet zelf, dus geen aparte bedrijfslijst meer.
  const [result, facets] = await Promise.all([
    listOrders({
      query: parsed.zoeken || undefined,
      status: (parsed.status || undefined) as OrderStatus | undefined,
      companyId: parsed.klant || undefined,
      van: parsed.van || undefined,
      tot: parsed.tot || undefined,
      page: parsed.pagina,
    }),
    getOrderFilterFacets({
      query: parsed.zoeken || undefined,
      status: (parsed.status || undefined) as OrderStatus | undefined,
      companyId: parsed.klant || undefined,
      van: parsed.van || undefined,
      tot: parsed.tot || undefined,
    }),
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
      <OrdersFilters values={parsed} facets={facets} />
      <ListBody>
        <OrdersList items={result.items} emptyMessage={emptyMessage} />
        <ListPagination
          page={parsed.pagina}
          totalPages={totalPages}
          hrefForPage={(pagina) => buildOrdersHref({ ...parsed, pagina })}
        />
      </ListBody>
    </ListBrowser>
  );
}
