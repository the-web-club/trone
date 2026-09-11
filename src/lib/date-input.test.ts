import { describe, expect, it } from "vitest";
import {
  calendarDateInTimeZone,
  normalizeTimeInput,
  startOfWeekInTimeZone,
  zonedLocalToUtc,
} from "@/lib/date-input";

describe("normalizeTimeInput", () => {
  it("normalizes hours and minutes", () => {
    expect(normalizeTimeInput("9:00")).toBe("09:00");
    expect(normalizeTimeInput("09:00")).toBe("09:00");
    expect(normalizeTimeInput("23:59")).toBe("23:59");
  });

  it("rejects impossible times", () => {
    expect(normalizeTimeInput("24:00")).toBeNull();
    expect(normalizeTimeInput("12:60")).toBeNull();
    expect(normalizeTimeInput("")).toBeNull();
  });
});

describe("zonedLocalToUtc", () => {
  it("converts Amsterdam summer time to UTC", () => {
    expect(zonedLocalToUtc("2026-09-13", "09:00")?.toISOString()).toBe(
      "2026-09-13T07:00:00.000Z",
    );
  });

  it("converts Amsterdam winter time to UTC", () => {
    expect(zonedLocalToUtc("2026-01-15", "09:00")?.toISOString()).toBe(
      "2026-01-15T08:00:00.000Z",
    );
  });
});

describe("calendar helpers", () => {
  it("reads the Amsterdam calendar date from a UTC instant", () => {
    expect(
      calendarDateInTimeZone(new Date("2026-09-12T22:00:00.000Z")),
    ).toBe("2026-09-13");
  });

  it("starts the week on Monday", () => {
    expect(
      startOfWeekInTimeZone(
        "Europe/Amsterdam",
        new Date("2026-09-11T12:00:00.000Z"),
      ),
    ).toBe("2026-09-07");
  });
});
