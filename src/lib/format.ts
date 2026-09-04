export function formatPersonName(
  firstName: string,
  lastName?: string | null,
): string {
  return [firstName, lastName].filter(Boolean).join(" ");
}

export function formatEuro(value: number | null | undefined): string | null {
  if (value == null || Number.isNaN(value)) return null;
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDateTime(value: Date): string {
  return new Intl.DateTimeFormat("nl-NL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}
