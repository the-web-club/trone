import type { Metadata } from "next";
import { CatalogPrices } from "@/components/catalog/catalog-prices";
import { isAdminSession, requireSession } from "@/lib/auth-session";
import { listProductsWithOptions } from "@/lib/catalog-service";

export const metadata: Metadata = { title: "Producten" };

export default async function ProductenPage() {
  const [session, catalog] = await Promise.all([
    requireSession(),
    listProductsWithOptions(),
  ]);
  const canEdit = isAdminSession(session);

  return (
    <div className="flex flex-col gap-8">
      <header className="page-header">
        <div className="page-header-copy">
          <h1 className="page-header-title">Producten</h1>
          <p className="page-header-description">
            Catalogusprijzen. Wijzigingen gelden alleen voor nieuwe offertes;
            bestaande offertes blijven bevroren.
          </p>
        </div>
      </header>

      {!canEdit ? (
        <p className="text-sm text-fg-muted">
          Alleen een beheerder kan prijzen wijzigen. Je kunt de catalogus wel
          bekijken.
        </p>
      ) : (
        <p className="text-sm text-fg-muted">
          Wijzig een bedrag en sla op met Enter of door het veld te verlaten.
        </p>
      )}

      <CatalogPrices
        products={catalog.products}
        options={catalog.options}
        canEdit={canEdit}
      />
    </div>
  );
}
