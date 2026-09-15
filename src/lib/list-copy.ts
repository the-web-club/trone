export function listSummary(total: number, singular: string, plural: string) {
  if (total === 1) return `1 ${singular}`;
  return `${total} ${plural}`;
}

/** Join visible fragments with a middot; skip empty values without leftover separators. */
export function joinMeta(
  parts: Array<string | number | null | undefined | false>,
): string {
  return parts
    .flatMap((part) => {
      if (part === false || part == null) return [];
      const text = String(part).trim();
      return text ? [text] : [];
    })
    .join(" · ");
}

export { countryLabel } from "@/lib/countries";
