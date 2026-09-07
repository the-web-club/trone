import { z } from "zod";
import { AppError } from "@/lib/errors";
import { letterheadFromUnknown, type Letterhead } from "@/lib/letterhead";

function emptyToUndefined(value: unknown): unknown {
  if (value == null) return undefined;
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

const optionalText = z.preprocess(emptyToUndefined, z.string().optional());

export const letterheadSchema = z.object({
  name: optionalText,
  addressLine: optionalText,
  postalCode: optionalText,
  city: optionalText,
  country: optionalText,
  cocNumber: optionalText,
  vatNumber: optionalText,
  iban: optionalText,
  phone: optionalText,
  email: z.preprocess(emptyToUndefined, z.email("Ongeldig e-mailadres").optional()),
  website: optionalText,
});

export type LetterheadInput = z.infer<typeof letterheadSchema>;

export function parseLetterheadForm(formData: FormData): Letterhead {
  const parsed = letterheadSchema.safeParse({
    name: formData.get("name"),
    addressLine: formData.get("addressLine"),
    postalCode: formData.get("postalCode"),
    city: formData.get("city"),
    country: formData.get("country"),
    cocNumber: formData.get("cocNumber"),
    vatNumber: formData.get("vatNumber"),
    iban: formData.get("iban"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    website: formData.get("website"),
  });
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    throw new AppError(first?.message ?? "Controleer het formulier.", "VALIDATION");
  }
  return letterheadFromUnknown(parsed.data);
}
