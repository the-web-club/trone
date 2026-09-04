import { z } from "zod";
import { AppError } from "@/lib/errors";

export const moneySchema = z.coerce
  .number({ error: "Bedrag is ongeldig" })
  .min(0, "Bedrag moet 0 of hoger zijn")
  .refine(
    (value) => Number.isFinite(value),
    "Bedrag is ongeldig",
  )
  .refine(
    (value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-6,
    "Maximaal 2 decimalen",
  );

export const swatchHexSchema = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}, z.string().regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, "Gebruik een hex-kleur zoals #1A1A1A").optional());

export function parseSwatchHex(value: unknown): string | undefined {
  const parsed = swatchHexSchema.safeParse(value);
  if (!parsed.success) {
    throw new AppError(
      parsed.error.issues[0]?.message ?? "Ongeldige swatchkleur.",
      "VALIDATION",
    );
  }
  return parsed.data;
}

export function parseMoney(value: unknown, label = "Bedrag"): number {
  const parsed = moneySchema.safeParse(value);
  if (!parsed.success) {
    throw new AppError(
      parsed.error.issues[0]?.message ?? `${label} is ongeldig.`,
      "VALIDATION",
    );
  }
  return Math.round(parsed.data * 100) / 100;
}
