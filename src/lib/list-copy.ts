export function listSummary(total: number, singular: string, plural: string) {
  if (total === 1) return `1 ${singular}`;
  return `${total} ${plural}`;
}

export const countryLabels: Record<string, string> = {
  NL: "Nederland",
  BE: "België",
  DE: "Duitsland",
  FR: "Frankrijk",
  GB: "Verenigd Koninkrijk",
};

export function countryLabel(code: string): string {
  return countryLabels[code] ?? code;
}
