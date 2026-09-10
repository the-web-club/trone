import { describe, expect, it } from "vitest";
import {
  isAutoHot,
  isFollowUpRipe,
  isStale,
} from "@/lib/opportunity-classify";

const now = new Date("2026-09-04T12:00:00.000Z");

describe("opportunity classifiers", () => {
  it("marks a lead stale after the quiet threshold", () => {
    expect(isStale(new Date("2026-08-20T12:00:00.000Z"), 14, now)).toBe(true);
    expect(isStale(new Date("2026-08-25T12:00:00.000Z"), 14, now)).toBe(false);
  });

  it("marks follow-up ripe when the last order is old and nothing newer exists", () => {
    expect(
      isFollowUpRipe({
        orderedAt: new Date("2026-01-01T00:00:00.000Z"),
        opvolgingMaanden: 3,
        lastNewDealOrQuoteAt: null,
        now,
      }),
    ).toBe(true);
    expect(
      isFollowUpRipe({
        orderedAt: new Date("2026-01-01T00:00:00.000Z"),
        opvolgingMaanden: 3,
        lastNewDealOrQuoteAt: new Date("2026-06-01T00:00:00.000Z"),
        now,
      }),
    ).toBe(false);
    expect(
      isFollowUpRipe({
        orderedAt: new Date("2026-08-01T00:00:00.000Z"),
        opvolgingMaanden: 3,
        lastNewDealOrQuoteAt: null,
        now,
      }),
    ).toBe(false);
  });

  it("suggests auto-hot for recent high-value open leads that are not marked", () => {
    expect(
      isAutoHot({
        isHot: false,
        status: "OPEN",
        valueEstimate: 3000,
        lastActivityAt: new Date("2026-09-02T12:00:00.000Z"),
        hotWaarde: 2500,
        now,
      }),
    ).toBe(true);
    expect(
      isAutoHot({
        isHot: true,
        status: "OPEN",
        valueEstimate: 3000,
        lastActivityAt: new Date("2026-09-02T12:00:00.000Z"),
        hotWaarde: 2500,
        now,
      }),
    ).toBe(false);
    expect(
      isAutoHot({
        isHot: false,
        status: "OPEN",
        valueEstimate: 1000,
        lastActivityAt: new Date("2026-09-02T12:00:00.000Z"),
        hotWaarde: 2500,
        now,
      }),
    ).toBe(false);
  });
});
