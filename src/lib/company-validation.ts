import { z } from "zod";
import { AppError } from "@/lib/errors";

function emptyToUndefined(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

export const companySchema = z.object({
  name: z.string().trim().min(1, "Naam is verplicht"),
  email: z.preprocess(emptyToUndefined, z.email("Ongeldig e-mailadres").optional()),
  vatNumber: z.preprocess(emptyToUndefined, z.string().optional()),
  cocNumber: z.preprocess(emptyToUndefined, z.string().optional()),
  website: z.preprocess(emptyToUndefined, z.string().optional()),
  phone: z.preprocess(emptyToUndefined, z.string().optional()),
  addressLine: z.preprocess(emptyToUndefined, z.string().optional()),
  postalCode: z.preprocess(emptyToUndefined, z.string().optional()),
  city: z.preprocess(emptyToUndefined, z.string().optional()),
  country: z
    .string()
    .trim()
    .transform((value) => (value === "" ? "NL" : value.toUpperCase()))
    .pipe(z.string().length(2, "Land is een landcode van 2 letters")),
  vatRate: z.coerce.number().min(0, "Btw moet 0 of hoger zijn").max(100, "Btw mag maximaal 100 zijn").default(21),
  notes: z.preprocess(emptyToUndefined, z.string().optional()),
});

export type CompanyInput = z.infer<typeof companySchema>;

export function parseCompanyForm(formData: FormData): CompanyInput {
  const parsed = companySchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    vatNumber: formData.get("vatNumber"),
    cocNumber: formData.get("cocNumber"),
    website: formData.get("website"),
    phone: formData.get("phone"),
    addressLine: formData.get("addressLine"),
    postalCode: formData.get("postalCode"),
    city: formData.get("city"),
    country: formData.get("country") || "NL",
    vatRate: formData.get("vatRate") || 21,
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    throw new AppError(first?.message ?? "Controleer het formulier.", "VALIDATION");
  }

  return parsed.data;
}
