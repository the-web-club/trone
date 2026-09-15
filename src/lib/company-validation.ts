import { z } from "zod";
import { isIsoCountryCode, normalizeCountryCode } from "@/lib/countries";
import { formInvalidFromZod, throwValidationFromZod } from "@/lib/form-validation";
import type { FieldErrors } from "@/lib/form-submission";

function emptyToUndefined(value: unknown): unknown {
  if (value == null) return undefined;
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
    .transform((value) => normalizeCountryCode(value === "" ? "NL" : value))
    .refine(isIsoCountryCode, "Kies een land"),
  vatRate: z.coerce.number().min(0, "Btw moet 0 of hoger zijn").max(100, "Btw mag maximaal 100 zijn").default(21),
  notes: z.preprocess(emptyToUndefined, z.string().optional()),
});

export type CompanyInput = z.infer<typeof companySchema>;

export type CompanyPatch = {
  name?: string;
  email?: string | null;
  vatNumber?: string | null;
  cocNumber?: string | null;
  website?: string | null;
  phone?: string | null;
  addressLine?: string | null;
  postalCode?: string | null;
  city?: string | null;
  country?: string;
  vatRate?: number;
  notes?: string | null;
};

export const COMPANY_VAT_RATE_OPTIONS = [0, 9, 21] as const;

function parseCompanyInput(data: unknown): CompanyInput {
  const parsed = companySchema.safeParse(data);
  if (!parsed.success) throwValidationFromZod(parsed.error);
  return parsed.data;
}

export function parseCompanyForm(formData: FormData): CompanyInput {
  return parseCompanyInput({
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
}

export function companyRecordToInput(company: {
  name: string;
  email?: string | null;
  vatNumber?: string | null;
  cocNumber?: string | null;
  website?: string | null;
  phone?: string | null;
  addressLine?: string | null;
  postalCode?: string | null;
  city?: string | null;
  country: string;
  vatRate: { toString(): string } | number | string;
  notes?: string | null;
}): CompanyInput {
  const raw = company.vatRate;
  const vatRate = Number(typeof raw === "object" ? raw.toString() : raw);

  return parseCompanyInput({
    name: company.name,
    email: company.email ?? undefined,
    vatNumber: company.vatNumber ?? undefined,
    cocNumber: company.cocNumber ?? undefined,
    website: company.website ?? undefined,
    phone: company.phone ?? undefined,
    addressLine: company.addressLine ?? undefined,
    postalCode: company.postalCode ?? undefined,
    city: company.city ?? undefined,
    country: company.country,
    vatRate,
    notes: company.notes ?? undefined,
  });
}

function mergeOptional(
  patch: string | null | undefined,
  current: string | undefined,
): string | undefined {
  if (patch === undefined) return current;
  return patch ?? undefined;
}

export function mergeCompanyPatch(
  current: CompanyInput,
  patch: CompanyPatch,
): CompanyInput {
  return parseCompanyInput({
    name: patch.name ?? current.name,
    email: mergeOptional(patch.email, current.email),
    vatNumber: mergeOptional(patch.vatNumber, current.vatNumber),
    cocNumber: mergeOptional(patch.cocNumber, current.cocNumber),
    website: mergeOptional(patch.website, current.website),
    phone: mergeOptional(patch.phone, current.phone),
    addressLine: mergeOptional(patch.addressLine, current.addressLine),
    postalCode: mergeOptional(patch.postalCode, current.postalCode),
    city: mergeOptional(patch.city, current.city),
    country: patch.country ?? current.country,
    vatRate: patch.vatRate ?? current.vatRate,
    notes: mergeOptional(patch.notes, current.notes),
  });
}

/** Compacte intake vanaf de configurator: naam, telefoon, e-mail. */
export function parseComposerCompanyForm(formData: FormData): CompanyInput {
  return parseCompanyInput({
    name: formData.get("companyName"),
    email: formData.get("companyEmail"),
    phone: formData.get("companyPhone"),
    country: formData.get("companyCountry") || "NL",
    vatRate: 21,
  });
}

const COMPOSER_FIELD_MAP: Record<string, string> = {
  name: "companyName",
  email: "companyEmail",
  phone: "companyPhone",
  country: "companyCountry",
};

export function safeParseComposerCompanyForm(
  formData: FormData,
):
  | { success: true }
  | { success: false; fieldErrors: FieldErrors; formError: string } {
  const parsed = companySchema.safeParse({
    name: formData.get("companyName"),
    email: formData.get("companyEmail"),
    phone: formData.get("companyPhone"),
    country: formData.get("companyCountry") || "NL",
    vatRate: 21,
  });
  if (!parsed.success) {
    const invalid = formInvalidFromZod(parsed.error);
    const fieldErrors: FieldErrors = {};
    for (const [key, message] of Object.entries(invalid.fieldErrors)) {
      fieldErrors[COMPOSER_FIELD_MAP[key] ?? key] = message;
    }
    return { success: false, fieldErrors, formError: invalid.formError };
  }
  return { success: true };
}

export function safeParseCompanyForm(
  formData: FormData,
):
  | { success: true }
  | { success: false; fieldErrors: FieldErrors; formError: string } {
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
  if (!parsed.success) return formInvalidFromZod(parsed.error);
  return { success: true };
}
