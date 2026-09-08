import { z } from "zod";
import { AppError } from "@/lib/errors";

function emptyToUndefined(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

export const quoteSelectionSchema = z.object({
  optionId: z.string().trim().min(1, "Optie ontbreekt"),
  optionValueId: z.string().trim().min(1, "Optiewaarde ontbreekt"),
});

export const productQuoteItemSchema = z.object({
  kind: z.literal("product"),
  productId: z.string().trim().min(1, "Product is verplicht"),
  quantity: z.coerce.number().int().min(1, "Aantal moet 1 of hoger zijn"),
  selections: z.array(quoteSelectionSchema),
});

const optionalUnitPriceSchema = z.preprocess((value) => {
  if (value == null || value === "") return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return null;
    const normalized = trimmed.includes(",")
      ? trimmed.replace(/\./g, "").replace(",", ".")
      : trimmed;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : value;
  }
  return value;
}, z
  .number({ error: "Prijs is ongeldig" })
  .min(0, "Prijs moet 0 of hoger zijn")
  .nullable()
  .refine(
    (value) =>
      value == null ||
      Math.abs(value * 100 - Math.round(value * 100)) < 1e-6,
    "Maximaal 2 decimalen",
  ));

export const customQuoteItemSchema = z.object({
  kind: z.literal("custom"),
  title: z.string().trim().min(1, "Titel is verplicht").max(191, "Titel is te lang"),
  description: z.preprocess((value) => {
    if (typeof value !== "string") return "";
    return value;
  }, z.string().max(5000, "Omschrijving is te lang")),
  unitPrice: optionalUnitPriceSchema,
});

export const quoteItemSchema = z.preprocess((value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const row = value as { kind?: unknown };
  if (row.kind == null) return { ...row, kind: "product" };
  return value;
}, z.discriminatedUnion("kind", [productQuoteItemSchema, customQuoteItemSchema]));

export const quoteSchema = z.object({
  companyId: z.string().trim().min(1, "Klant is verplicht"),
  contactId: z.preprocess(emptyToUndefined, z.string().optional()),
  dealId: z.preprocess(emptyToUndefined, z.string().optional()),
  items: z.array(quoteItemSchema).min(1, "Voeg minstens één regel toe"),
});

export type QuoteSelectionInput = z.infer<typeof quoteSelectionSchema>;
export type ProductQuoteItemInput = z.infer<typeof productQuoteItemSchema>;
export type CustomQuoteItemInput = z.infer<typeof customQuoteItemSchema>;
export type QuoteItemInput = z.infer<typeof quoteItemSchema>;
export type QuoteInput = z.infer<typeof quoteSchema>;

export function isCustomQuoteItem(
  item: QuoteItemInput,
): item is CustomQuoteItemInput {
  return item.kind === "custom";
}

export function parseQuoteForm(formData: FormData): QuoteInput {
  const raw = formData.get("payload");
  let data: unknown;
  try {
    data = JSON.parse(String(raw ?? ""));
  } catch {
    throw new AppError("Offertegegevens zijn ongeldig.", "VALIDATION");
  }

  const parsed = quoteSchema.safeParse(data);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    throw new AppError(first?.message ?? "Controleer het formulier.", "VALIDATION");
  }
  return parsed.data;
}

export const quoteStatuses = [
  "DRAFT",
  "SENT",
  "ACCEPTED",
  "REJECTED",
  "EXPIRED",
] as const;

export const quoteStatusSchema = z.enum(quoteStatuses);

export type QuoteStatusInput = z.infer<typeof quoteStatusSchema>;

export function parseQuoteStatusForm(formData: FormData): QuoteStatusInput {
  const parsed = quoteStatusSchema.safeParse(formData.get("status"));
  if (!parsed.success) {
    throw new AppError("Ongeldige offertestatus.", "VALIDATION");
  }
  return parsed.data;
}

export const quoteOutcomeStatuses = ["ACCEPTED", "REJECTED", "EXPIRED"] as const;

export const quoteOutcomeSchema = z.enum(quoteOutcomeStatuses);

export type QuoteOutcomeInput = z.infer<typeof quoteOutcomeSchema>;

export function parseQuoteId(formData: FormData): string {
  const parsed = z.string().trim().min(1, "Offerte ontbreekt").safeParse(
    formData.get("id"),
  );
  if (!parsed.success) {
    throw new AppError("Offerte ontbreekt.", "VALIDATION");
  }
  return parsed.data;
}

export function parseQuoteOutcomeForm(formData: FormData): QuoteOutcomeInput {
  const parsed = quoteOutcomeSchema.safeParse(formData.get("status"));
  if (!parsed.success) {
    throw new AppError("Ongeldige offertestatus.", "VALIDATION");
  }
  return parsed.data;
}

export const quoteVersionNumberSchema = z.coerce
  .number()
  .int()
  .min(1, "Versienummer ontbreekt");

export function parseQuoteVersionNumber(value: unknown): number {
  const parsed = quoteVersionNumberSchema.safeParse(value);
  if (!parsed.success) {
    throw new AppError("Ongeldig versienummer.", "VALIDATION");
  }
  return parsed.data;
}

export const quoteStatusLabels = {
  DRAFT: "Concept",
  SENT: "Verzonden",
  ACCEPTED: "Geaccepteerd",
  REJECTED: "Afgewezen",
  EXPIRED: "Verlopen",
} as const;

export const quoteStatusTones = {
  DRAFT: "default",
  SENT: "info",
  ACCEPTED: "success",
  REJECTED: "danger",
  EXPIRED: "warning",
} as const;
