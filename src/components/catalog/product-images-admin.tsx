"use client";

import { useState } from "react";
import {
  addProductImageAction,
  deleteProductImageAction,
  setDefaultImageAction,
} from "@/app/(beveiligd)/actions/catalog-actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { isImageKeyOption, mediaUrl } from "@/lib/product-visuals";
import type { ProductImageMatch } from "@/lib/product-visuals";

type AdminOption = {
  id: string;
  code: string;
  name: string;
  values: { id: string; value: string }[];
};

export function ProductImagesAdmin({
  products,
  options,
  images,
  canEdit,
}: {
  products: { id: string; name: string; sku: string }[];
  options: AdminOption[];
  images: ProductImageMatch[];
  canEdit: boolean;
}) {
  const keyOptions = options.filter((option) => isImageKeyOption(option.code));
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  function valueLabel(optionId: string, optionValueId: string) {
    const option = options.find((row) => row.id === optionId);
    const value = option?.values.find((row) => row.id === optionValueId);
    return `${option?.name ?? "Optie"}: ${value?.value ?? optionValueId}`;
  }

  async function onUpload(formData: FormData) {
    setError(null);
    setStatus("Bezig…");
    const result = await addProductImageAction(formData);
    if (result.error) {
      setStatus(null);
      setError(result.error);
      return;
    }
    setStatus("Afbeelding opgeslagen");
    window.setTimeout(() => setStatus(null), 2000);
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-md font-medium text-fg">Productafbeeldingen</h2>
      <p className="text-sm text-fg-muted">
        Koppel een beeld aan bekledingskleur en rughoogte. Leeg laten geldt
        breder. Later kunnen extra sleutelkeuzes dezelfde koppeling gebruiken.
      </p>
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      {status ? <p className="text-sm text-success">{status}</p> : null}

      {products.map((product) => {
        const productImages = images.filter((image) => image.productId === product.id);
        return (
          <Card key={product.id} className="flex flex-col gap-4 p-4">
            <h3 className="text-sm font-medium text-fg">
              {product.name}{" "}
              <span className="text-fg-muted">({product.sku})</span>
            </h3>

            {canEdit ? (
              <form action={onUpload} className="grid gap-3 md:grid-cols-2">
                <input type="hidden" name="productId" value={product.id} />
                <FormField id={`file-${product.id}`} label="Afbeelding">
                  <Input
                    type="file"
                    name="file"
                    accept="image/png,image/jpeg,image/webp"
                    required
                  />
                </FormField>
                {keyOptions.map((option) => (
                  <FormField
                    key={option.id}
                    id={`${product.id}-${option.code}`}
                    label={option.name}
                  >
                    <Select name="selection" defaultValue="">
                      <option value="">Geldt voor alle {option.name.toLowerCase()}</option>
                      {option.values.map((value) => (
                        <option
                          key={value.id}
                          value={`${option.id}:${value.id}`}
                        >
                          {value.value}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                ))}
                <label className="flex h-8 items-center gap-2 text-sm text-fg md:col-span-2">
                  <input type="checkbox" name="isDefault" className="size-4 accent-[var(--accent)]" />
                  Standaardbeeld voor dit model
                </label>
                <div>
                  <Button type="submit" variant="secondary">
                    Beeld uploaden
                  </Button>
                </div>
              </form>
            ) : null}

            {productImages.length === 0 ? (
              <p className="text-sm text-fg-muted">Nog geen beelden.</p>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {productImages.map((image) => (
                  <li
                    key={image.id}
                    className="flex flex-col gap-2 rounded-sm border border-border p-2"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={mediaUrl(image.imageUrl)}
                      alt=""
                      className="h-36 w-full rounded-sm object-cover"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      {image.isDefault ? <Badge tone="info">Standaard</Badge> : null}
                      <p className="text-xs text-fg-muted">
                        {image.selections.length === 0
                          ? "Geen specifieke koppeling"
                          : image.selections
                              .map((row) => valueLabel(row.optionId, row.optionValueId))
                              .join(" · ")}
                      </p>
                    </div>
                    {canEdit ? (
                      <div className="flex flex-wrap gap-2">
                        {!image.isDefault ? (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => void setDefaultImageAction(image.id)}
                          >
                            Als standaard
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => void deleteProductImageAction(image.id)}
                        >
                          Verwijderen
                        </Button>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        );
      })}
    </section>
  );
}
