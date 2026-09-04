import { z } from "zod";
import { AppError } from "@/lib/errors";

export const workLogCategories = [
  "MONTAGE",
  "BELRONDE",
  "BEZOEK",
  "ADMINISTRATIE",
  "OVERIG",
] as const;

export type WorkLogCategory = (typeof workLogCategories)[number];

export const workLogCategoryLabels: Record<WorkLogCategory, string> = {
  MONTAGE: "Montage",
  BELRONDE: "Belronde",
  BEZOEK: "Bezoek",
  ADMINISTRATIE: "Administratie",
  OVERIG: "Overig",
};

function emptyToUndefined(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

function optionalDate(value: unknown): unknown {
  const cleaned = emptyToUndefined(value);
  if (cleaned === undefined) return undefined;
  const date = new Date(String(cleaned));
  return Number.isNaN(date.getTime()) ? cleaned : date;
}

export const workLogSchema = z.object({
  description: z.string().trim().min(1, "Omschrijving is verplicht"),
  category: z.preprocess(
    (value) => emptyToUndefined(value) ?? "OVERIG",
    z.enum(workLogCategories, { error: "Kies een geldige categorie" }),
  ),
  occurredAt: z.preprocess(
    optionalDate,
    z.date({ error: "Ongeldige datum" }).optional(),
  ),
  durationMinutes: z.preprocess((value) => {
    const cleaned = emptyToUndefined(value);
    if (cleaned === undefined) return undefined;
    return cleaned;
  }, z.coerce.number().int("Duur moet een heel getal zijn").min(1, "Duur moet minstens 1 minuut zijn").max(10080, "Duur is te lang").optional()),
  companyId: z.preprocess(emptyToUndefined, z.string().optional()),
  orderId: z.preprocess(emptyToUndefined, z.string().optional()),
});

export type WorkLogInput = z.infer<typeof workLogSchema>;

export function parseWorkLogForm(formData: FormData): WorkLogInput {
  const parsed = workLogSchema.safeParse({
    description: formData.get("description"),
    category: formData.get("category"),
    occurredAt: formData.get("occurredAt"),
    durationMinutes: formData.get("durationMinutes"),
    companyId: formData.get("companyId"),
    orderId: formData.get("orderId"),
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    throw new AppError(first?.message ?? "Controleer het formulier.", "VALIDATION");
  }

  return parsed.data;
}

export function parseWorkLogId(formData: FormData): string {
  const parsed = z
    .string()
    .trim()
    .min(1, "Logboekitem ontbreekt")
    .safeParse(formData.get("id"));

  if (!parsed.success) {
    throw new AppError("Logboekitem ontbreekt.", "VALIDATION");
  }

  return parsed.data;
}

export const workLogFilterSchema = z.object({
  userId: z.preprocess(emptyToUndefined, z.string().optional()),
  category: z.preprocess(
    emptyToUndefined,
    z.enum(workLogCategories).optional(),
  ),
  companyId: z.preprocess(emptyToUndefined, z.string().optional()),
  orderId: z.preprocess(emptyToUndefined, z.string().optional()),
  from: z.preprocess(optionalDate, z.date().optional()),
  to: z.preprocess(optionalDate, z.date().optional()),
});

export type WorkLogFilter = z.infer<typeof workLogFilterSchema>;

export function parseWorkLogFilters(input: {
  userId?: string;
  category?: string;
  companyId?: string;
  orderId?: string;
  from?: string;
  to?: string;
}): WorkLogFilter {
  const parsed = workLogFilterSchema.safeParse(input);
  if (!parsed.success) {
    return {};
  }
  return parsed.data;
}
