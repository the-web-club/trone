"use client";

import {
  updateOptionValuePriceAction,
  updateProductBasePriceAction,
} from "@/app/(beveiligd)/actions/catalog-actions";
import { PriceField } from "@/components/catalog/price-field";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHeader,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";

export type CatalogProductPrice = {
  id: string;
  sku: string;
  name: string;
  basePrice: number;
};

export type CatalogOptionPrice = {
  id: string;
  name: string;
  values: {
    id: string;
    value: string;
    priceDelta: number;
    priceOnRequest: boolean;
  }[];
};

export function CatalogPrices({
  products,
  options,
  canEdit,
}: {
  products: CatalogProductPrice[];
  options: CatalogOptionPrice[];
  canEdit: boolean;
}) {
  return (
    <>
      <section className="flex flex-col gap-3">
        <h2 className="text-md font-medium text-fg">Basisprijzen</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {products.map((product) => (
            <Card
              key={product.id}
              className="flex items-center justify-between gap-4 p-4"
            >
              <div>
                <p className="text-sm font-medium text-fg">{product.name}</p>
                <p className="text-xs text-fg-muted">{product.sku}</p>
              </div>
              <PriceField
                key={`${product.id}-${product.basePrice}`}
                value={product.basePrice}
                canEdit={canEdit}
                ariaLabel={`Basisprijs ${product.name}`}
                onSave={(basePrice) =>
                  updateProductBasePriceAction(product.id, basePrice)
                }
              />
            </Card>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-md font-medium text-fg">Meerprijzen per optie</h2>
        {options.map((option) => (
          <div key={option.id} className="flex flex-col gap-2">
            <h3 className="text-sm font-medium text-fg">{option.name}</h3>
            <TableContainer>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHeaderCell>Waarde</TableHeaderCell>
                    <TableHeaderCell align="right">Meerprijs</TableHeaderCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {option.values.map((value) => (
                    <TableRow key={value.id}>
                      <TableCell>{value.value}</TableCell>
                      <TableCell align="right">
                        <div className="flex justify-end">
                          <PriceField
                            key={`${value.id}-${value.priceDelta}`}
                            value={value.priceDelta}
                            canEdit={canEdit}
                            onRequest={value.priceOnRequest}
                            ariaLabel={`Meerprijs ${option.name} ${value.value}`}
                            onSave={(priceDelta) =>
                              updateOptionValuePriceAction(value.id, priceDelta)
                            }
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </div>
        ))}
      </section>
    </>
  );
}
