const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^(\d{1,2}):(\d{2})$/;

export const APP_TIME_ZONE = "Europe/Amsterdam";

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

/** Accepts `HH:mm` (24h). */
export function normalizeTimeInput(
  value: string | null | undefined,
): string | null {
  const trimmed = value?.trim() ?? "";
  const match = trimmed.match(TIME_RE);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function addCalendarDays(value: string, days: number): string {
  const [year, month, day] = value.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day + days));
  return `${utc.getUTCFullYear()}-${pad2(utc.getUTCMonth() + 1)}-${pad2(utc.getUTCDate())}`;
}

export function startOfZonedDate(
  date: string,
  timeZone = APP_TIME_ZONE,
): Date {
  const parsed = zonedLocalToUtc(date, "00:00", timeZone);
  if (!parsed) {
    throw new Error(`Ongeldige datum: ${date}`);
  }
  return parsed;
}

export function endExclusiveOfZonedDate(
  date: string,
  timeZone = APP_TIME_ZONE,
): Date {
  return startOfZonedDate(addCalendarDays(date, 1), timeZone);
}

function timeZoneOffsetMs(instant: Date, timeZone: string): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(instant)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return asUtc - instant.getTime();
}

/** Wall-clock `YYYY-MM-DD` + `HH:mm` in `timeZone` as a UTC Date. */
export function zonedLocalToUtc(
  date: string,
  time: string,
  timeZone = APP_TIME_ZONE,
): Date | null {
  const day = normalizeDateOnlyInput(date);
  const clock = normalizeTimeInput(time);
  if (!day || !clock) return null;
  const [year, month, dayNum] = day.split("-").map(Number);
  const [hour, minute] = clock.split(":").map(Number);
  const asUtcComponents = Date.UTC(year, month - 1, dayNum, hour, minute, 0);
  const offset = timeZoneOffsetMs(new Date(asUtcComponents), timeZone);
  const first = new Date(asUtcComponents - offset);
  const corrected = timeZoneOffsetMs(first, timeZone);
  return new Date(asUtcComponents - corrected);
}

export function calendarDateInTimeZone(
  value: Date,
  timeZone = APP_TIME_ZONE,
): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(value)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function todayInTimeZone(timeZone = APP_TIME_ZONE, now = new Date()): string {
  return calendarDateInTimeZone(now, timeZone);
}

/** Monday of the current week (ISO), as `YYYY-MM-DD` in the timezone. */
export function startOfWeekInTimeZone(
  timeZone = APP_TIME_ZONE,
  now = new Date(),
): string {
  const today = calendarDateInTimeZone(now, timeZone);
  const weekdayName = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(now);
  const isoWeekday =
    { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 }[weekdayName] ?? 0;
  return addCalendarDays(today, -isoWeekday);
}

export function endExclusiveOfWeekInTimeZone(
  timeZone = APP_TIME_ZONE,
  now = new Date(),
): string {
  return addCalendarDays(startOfWeekInTimeZone(timeZone, now), 7);
}

/**
 * Empty date+time → undefined (caller uses "now").
 * Date without time → start of that day in Amsterdam.
 */
export function parseOptionalDateTimeInput(
  date: string | null | undefined,
  time: string | null | undefined,
): Date | undefined {
  const day = normalizeDateOnlyInput(date);
  const clock = normalizeTimeInput(time);
  if (!day && !clock) return undefined;
  if (!day) return undefined;
  return zonedLocalToUtc(day, clock ?? "00:00") ?? undefined;
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
