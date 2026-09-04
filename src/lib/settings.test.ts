import { describe, expect, it } from "vitest";
import {
  DEFAULT_THRESHOLDS,
  parseThresholdNumber,
  thresholdsFromRows,
} from "@/lib/settings";

describe("settings thresholds", () => {
  it("falls back for missing or invalid values", () => {
    expect(parseThresholdNumber(undefined, 14)).toBe(14);
    expect(parseThresholdNumber("abc", 14)).toBe(14);
    expect(parseThresholdNumber("0", 14)).toBe(14);
    expect(parseThresholdNumber("-2", 14)).toBe(14);
    expect(parseThresholdNumber("21", 14)).toBe(21);
  });

  it("uses defaults when rows are empty", () => {
    expect(thresholdsFromRows([])).toEqual(DEFAULT_THRESHOLDS);
  });

  it("reads stored keys without overwriting missing ones", () => {
    expect(
      thresholdsFromRows([
        { key: "stil_dagen", value: "10" },
        { key: "hot_waarde", value: "4000" },
      ]),
    ).toEqual({
      stilDagen: 10,
      opvolgingMaanden: 3,
      hotWaarde: 4000,
    });
  });
});
