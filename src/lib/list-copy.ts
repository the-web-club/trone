export function listSummary(total: number, singular: string, plural: string) {
  if (total === 1) return `1 ${singular}`;
  return `${total} ${plural}`;
}

export { countryLabel } from "@/lib/countries";
