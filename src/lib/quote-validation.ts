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

export const quoteItemSchema = z.object({
  productId: z.string().trim().min(1, "Product is verplicht"),
  quantity: z.coerce.number().int().min(1, "Aantal moet 1 of hoger zijn"),
  selections: z.array(quoteSelectionSchema),
});

export const quoteSchema = z.object({
  companyId: z.string().trim().min(1, "Klant is verplicht"),
  contactId: z.preprocess(emptyToUndefined, z.string().optional()),
  dealId: z.preprocess(emptyToUndefined, z.string().optional()),
  items: z.array(quoteItemSchema).min(1, "Voeg minstens één regel toe"),
});

export type QuoteSelectionInput = z.infer<typeof quoteSelectionSchema>;
export type QuoteItemInput = z.infer<typeof quoteItemSchema>;
export type QuoteInput = z.infer<typeof quoteSchema>;

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
