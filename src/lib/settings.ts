export const SETTING_KEYS = {
  stilDagen: "stil_dagen",
  opvolgingMaanden: "opvolging_maanden",
  hotWaarde: "hot_waarde",
} as const;

export const DEFAULT_THRESHOLDS = {
  stilDagen: 14,
  opvolgingMaanden: 3,
  hotWaarde: 2500,
} as const;

export type Thresholds = {
  stilDagen: number;
  opvolgingMaanden: number;
  hotWaarde: number;
};

export function parseThresholdNumber(
  value: string | null | undefined,
  fallback: number,
): number {
  if (value == null) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

export function thresholdsFromRows(
  rows: Array<{ key: string; value: string }>,
): Thresholds {
  const map = new Map(rows.map((row) => [row.key, row.value]));
  return {
    stilDagen: parseThresholdNumber(
      map.get(SETTING_KEYS.stilDagen),
      DEFAULT_THRESHOLDS.stilDagen,
    ),
    opvolgingMaanden: parseThresholdNumber(
      map.get(SETTING_KEYS.opvolgingMaanden),
      DEFAULT_THRESHOLDS.opvolgingMaanden,
    ),
    hotWaarde: parseThresholdNumber(
      map.get(SETTING_KEYS.hotWaarde),
      DEFAULT_THRESHOLDS.hotWaarde,
    ),
  };
}
