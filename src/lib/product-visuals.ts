import { isPlaceholderUrl } from "@/lib/placeholder-visuals";

export const SWATCH_OPTION_CODES = ["fabric"] as const;
export const IMAGE_KEY_OPTION_CODES = ["fabric", "back_height"] as const;

export const PRODUCT_IMAGE_PLACEHOLDER = "/placeholders/placeholder-product.svg";

/** Maakt een Blob-URL toonbaar in de app (private store via /api/media). */
export function mediaUrl(url: string): string {
  if (!url || url.startsWith("/") || url.startsWith("data:")) return url;
  return `/api/media?url=${encodeURIComponent(url)}`;
}

export type ImageSelection = {
  optionId: string;
  optionValueId: string;
};

export type ProductImageMatch = {
  id: string;
  productId: string;
  imageUrl: string;
  isDefault: boolean;
  selections: ImageSelection[];
};

/**
 * Kiest het best passende productbeeld.
 * Een beeld telt als match als al zijn gekoppelde (optie,waarde)-paren
 * in de huidige selectie zitten. Hoe meer koppelingen, hoe specifieker.
 * Geen specifieke match → isDefault van het model → placeholder.
 * Extra sleutelkeuzes later: voeg codes toe aan IMAGE_KEY_OPTION_CODES
 * en koppel die via ProductImageSelection; deze matcher hoeft niet om.
 */
export function resolveImage(
  productId: string,
  selections: ImageSelection[],
  images: ProductImageMatch[],
): string {
  const forProduct = images.filter((image) => image.productId === productId);
  const selected = new Set(
    selections.map((row) => `${row.optionId}:${row.optionValueId}`),
  );

  const matches = forProduct
    .map((image) => {
      const allMatch = image.selections.every((row) =>
        selected.has(`${row.optionId}:${row.optionValueId}`),
      );
      return { image, allMatch, score: image.selections.length };
    })
    .filter((row) => row.allMatch && row.score > 0)
    .sort((a, b) => {
      const score = b.score - a.score;
      if (score !== 0) return score;
      const real =
        Number(!isPlaceholderUrl(b.image.imageUrl)) -
        Number(!isPlaceholderUrl(a.image.imageUrl));
      if (real !== 0) return real;
      return Number(b.image.isDefault) - Number(a.image.isDefault);
    });

  if (matches[0]) return mediaUrl(matches[0].image.imageUrl);

  const fallback = forProduct.find((image) => image.isDefault);
  return fallback ? mediaUrl(fallback.imageUrl) : PRODUCT_IMAGE_PLACEHOLDER;
}

export function isSwatchOption(code: string): boolean {
  return (SWATCH_OPTION_CODES as readonly string[]).includes(code);
}

export function isImageKeyOption(code: string): boolean {
  return (IMAGE_KEY_OPTION_CODES as readonly string[]).includes(code);
}
