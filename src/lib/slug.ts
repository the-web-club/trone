export const RESERVED_SLUGS = new Set(["nieuw", "exporteren", "bewerken"]);

const SLUG_MAX = 80;

export function slugify(value: string, fallback = "item"): string {
  const slug = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX)
    .replace(/-+$/g, "");
  return slug || fallback;
}

export function personSlugSource(
  firstName: string,
  lastName?: string | null,
): string {
  return [firstName, lastName].filter(Boolean).join(" ");
}

export async function allocateUniqueSlug(
  isTaken: (slug: string) => Promise<boolean>,
  source: string,
  fallback: string,
): Promise<string> {
  const base = slugify(source, fallback);
  const start = RESERVED_SLUGS.has(base) ? `${base}-1` : base;
  let candidate = start;
  let n = 2;
  while (await isTaken(candidate)) {
    candidate = `${base}-${n}`;
    n += 1;
    if (n > 1000) {
      throw new Error("Kon geen unieke slug toewijzen.");
    }
  }
  return candidate;
}
