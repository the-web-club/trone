export const PLACEHOLDER_DIR = "placeholders";

export function slugifyLabel(value: string): string {
  const slug = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "waarde";
}

export function placeholderValuePath(optionCode: string, value: string): string {
  return `/${PLACEHOLDER_DIR}/placeholder-${optionCode}-${slugifyLabel(value)}.svg`;
}

export function placeholderSwatchPath(optionCode: string, value: string): string {
  return `/${PLACEHOLDER_DIR}/placeholder-swatch-${optionCode}-${slugifyLabel(value)}.svg`;
}

export function placeholderProductPath(sku: string): string {
  return `/${PLACEHOLDER_DIR}/placeholder-product-${slugifyLabel(sku)}.svg`;
}

export function placeholderComboPath(
  sku: string,
  backHeight: string,
  fabric: string,
): string {
  return `/${PLACEHOLDER_DIR}/placeholder-${slugifyLabel(sku)}-${slugifyLabel(backHeight)}-${slugifyLabel(fabric)}.svg`;
}

export function isPlaceholderUrl(url: string): boolean {
  return url.startsWith(`/${PLACEHOLDER_DIR}/`);
}
