const DAY_MS = 24 * 60 * 60 * 1000;

export function daysBetween(from: Date, now: Date) {
  return (now.getTime() - from.getTime()) / DAY_MS;
}

export function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

export function isStale(lastActivityAt: Date, stilDagen: number, now: Date) {
  return daysBetween(lastActivityAt, now) > stilDagen;
}

export function isFollowUpRipe(input: {
  orderedAt: Date;
  opvolgingMaanden: number;
  lastNewDealOrQuoteAt: Date | null;
  now: Date;
}) {
  if (input.now < addMonths(input.orderedAt, input.opvolgingMaanden)) {
    return false;
  }
  if (
    input.lastNewDealOrQuoteAt &&
    input.lastNewDealOrQuoteAt > input.orderedAt
  ) {
    return false;
  }
  return true;
}

export function isAutoHot(input: {
  isHot: boolean;
  status: string;
  valueEstimate: number | null;
  lastActivityAt: Date | null;
  hotWaarde: number;
  now: Date;
  recentDays?: number;
}) {
  if (input.isHot || input.status !== "OPEN") return false;
  if (input.valueEstimate == null || input.valueEstimate < input.hotWaarde) {
    return false;
  }
  if (!input.lastActivityAt) return false;
  return daysBetween(input.lastActivityAt, input.now) <= (input.recentDays ?? 7);
}
