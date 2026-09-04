import { formatEuroExact } from "@/lib/format";

export function meerprijsLabel(value: {
  priceOnRequest: boolean;
  priceDelta: number;
}): string | null {
  if (value.priceOnRequest) return "Op aanvraag";
  if (!value.priceDelta) return null;
  const formatted = formatEuroExact(Math.abs(value.priceDelta));
  return value.priceDelta > 0 ? `+ ${formatted}` : `− ${formatted}`;
}

export const OP_AANVRAAG_HINT =
  "De productspecialist bepaalt de prijs.";
