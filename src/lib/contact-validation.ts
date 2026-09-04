import { z } from "zod";
import { AppError } from "@/lib/errors";

function emptyToUndefined(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

export const contactSchema = z.object({
  firstName: z.string().trim().min(1, "Voornaam is verplicht"),
  lastName: z.preprocess(emptyToUndefined, z.string().optional()),
  jobTitle: z.preprocess(emptyToUndefined, z.string().optional()),
  email: z.preprocess(emptyToUndefined, z.email("Ongeldig e-mailadres").optional()),
  phone: z.preprocess(emptyToUndefined, z.string().optional()),
  notes: z.preprocess(emptyToUndefined, z.string().optional()),
  isPrimary: z
    .union([z.boolean(), z.string(), z.null(), z.undefined()])
    .transform((value) => value === true || value === "on" || value === "true"),
});

export type ContactInput = z.infer<typeof contactSchema>;

export function parseContactForm(formData: FormData): ContactInput {
  const parsed = contactSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    jobTitle: formData.get("jobTitle"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    notes: formData.get("notes"),
    isPrimary: formData.get("isPrimary"),
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    throw new AppError(first?.message ?? "Controleer het formulier.", "VALIDATION");
  }

  return parsed.data;
}
