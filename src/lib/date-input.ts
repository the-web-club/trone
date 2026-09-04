const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Accepts `YYYY-MM-DD`; rejects impossible calendar days. */
export function normalizeDateOnlyInput(
  value: string | null | undefined,
): string | null {
  const trimmed = value?.trim() ?? "";
  const match = trimmed.match(DATE_ONLY_RE);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utc = new Date(Date.UTC(year, month - 1, day));
  if (
    utc.getUTCFullYear() !== year ||
    utc.getUTCMonth() !== month - 1 ||
    utc.getUTCDate() !== day
  ) {
    return null;
  }

  return `${match[1]}-${match[2]}-${match[3]}`;
}

/** Inclusive start of a calendar day (UTC midnight). */
export function startOfCalendarDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/** Exclusive end: UTC midnight of the next calendar day. */
export function endExclusiveOfCalendarDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + 1));
}

export function parseAmountInput(
  value: string | null | undefined,
): number | null {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return null;
  const normalized = trimmed.replace(",", ".");
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return amount;
}
