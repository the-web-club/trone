"use client";

import { useState } from "react";
import { updateOptionValueSwatchAction } from "@/app/(beveiligd)/actions/catalog-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { mediaUrl } from "@/lib/product-visuals";

export function SwatchEditor({
  optionValueId,
  label,
  swatchHex,
  swatchImageUrl,
  canEdit,
}: {
  optionValueId: string;
  label: string;
  swatchHex: string | null;
  swatchImageUrl: string | null;
  canEdit: boolean;
}) {
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(formData: FormData) {
    setError(null);
    setStatus("Bezig…");
    const result = await updateOptionValueSwatchAction(formData);
    if (result.error) {
      setStatus(null);
      setError(result.error);
      return;
    }
    setStatus("Opgeslagen");
    window.setTimeout(() => setStatus(null), 2000);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className="size-8 shrink-0 overflow-hidden rounded-full border border-border"
        title={label}
        style={swatchHex ? { backgroundColor: swatchHex } : undefined}
      >
        {swatchImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mediaUrl(swatchImageUrl)} alt="" className="size-full object-cover" />
        ) : null}
      </span>
      {canEdit ? (
        <form action={onSubmit} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="optionValueId" value={optionValueId} />
          <input
            type="color"
            name="swatchHex"
            defaultValue={swatchHex && /^#([0-9A-Fa-f]{6})$/.test(swatchHex) ? swatchHex : "#888888"}
            aria-label={`Kleur ${label}`}
            className="h-8 w-10 cursor-pointer rounded-sm border border-border bg-surface"
          />
          <Input
            type="file"
            name="file"
            accept="image/png,image/jpeg,image/webp"
            aria-label={`Swatchafbeelding ${label}`}
            className="max-w-52"
          />
          <Button type="submit" variant="secondary" size="sm">
            Swatch opslaan
          </Button>
        </form>
      ) : null}
      {status ? <span className="text-xs text-success">{status}</span> : null}
      {error ? (
        <span className="text-xs text-danger" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
