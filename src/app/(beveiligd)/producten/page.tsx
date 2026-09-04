import type { Metadata } from "next";
import { CatalogPrices } from "@/components/catalog/catalog-prices";
import { ProductImagesAdmin } from "@/components/catalog/product-images-admin";
import { SwatchEditor } from "@/components/catalog/swatch-editor";
import { isAdminSession, requireSession } from "@/lib/auth-session";
import { listProductsWithOptions } from "@/lib/catalog-service";
import { isSwatchOption } from "@/lib/product-visuals";

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

      <section className="flex flex-col gap-4">
        <h2 className="text-md font-medium text-fg">Kleur- en stofswatches</h2>
        {catalog.options
          .filter((option) => isSwatchOption(option.code))
          .map((option) => (
            <div key={option.id} className="flex flex-col gap-3">
              <h3 className="text-sm font-medium text-fg">{option.name}</h3>
              <ul className="flex flex-col gap-3">
                {option.values.map((value) => (
                  <li
                    key={value.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-border px-3 py-2"
                  >
                    <span className="text-sm text-fg">{value.value}</span>
                    <SwatchEditor
                      optionValueId={value.id}
                      label={value.value}
                      swatchHex={value.swatchHex}
                      swatchImageUrl={value.swatchImageUrl}
                      canEdit={canEdit}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
      </section>

      <ProductImagesAdmin
        products={catalog.products}
        options={catalog.options}
        images={catalog.images}
        canEdit={canEdit}
      />
    </div>
  );
}
