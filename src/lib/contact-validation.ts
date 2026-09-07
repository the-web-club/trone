import { z } from "zod";
import { AppError } from "@/lib/errors";

function emptyToUndefined(value: unknown): unknown {
  if (value == null) return undefined;
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

export const contactSchema = z.object({
  firstName: z.preprocess(
    (value) => (typeof value === "string" ? value : ""),
    z.string().trim().min(1, "Voornaam is verplicht"),
  ),
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

export type ContactPatch = {
  firstName?: string;
  lastName?: string | null;
  jobTitle?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  isPrimary?: boolean;
};

function hasFilledValue(value: unknown): boolean {
  return typeof value === "string" && value.trim() !== "";
}

function parseContactInput(data: unknown): ContactInput {
  const parsed = contactSchema.safeParse(data);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    throw new AppError(first?.message ?? "Controleer het formulier.", "VALIDATION");
  }
  return parsed.data;
}

export function parseContactForm(formData: FormData): ContactInput {
  return parseContactInput({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    jobTitle: formData.get("jobTitle"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    notes: formData.get("notes"),
    isPrimary: formData.get("isPrimary"),
  });
}

export function contactRecordToInput(contact: {
  firstName: string;
  lastName?: string | null;
  jobTitle?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  isPrimary: boolean;
}): ContactInput {
  return parseContactInput({
    firstName: contact.firstName,
    lastName: contact.lastName ?? undefined,
    jobTitle: contact.jobTitle ?? undefined,
    email: contact.email ?? undefined,
    phone: contact.phone ?? undefined,
    notes: contact.notes ?? undefined,
    isPrimary: contact.isPrimary,
  });
}

function mergeOptional(
  patch: string | null | undefined,
  current: string | undefined,
): string | undefined {
  if (patch === undefined) return current;
  return patch ?? undefined;
}

export function mergeContactPatch(
  current: ContactInput,
  patch: ContactPatch,
): ContactInput {
  return parseContactInput({
    firstName: patch.firstName ?? current.firstName,
    lastName: mergeOptional(patch.lastName, current.lastName),
    jobTitle: mergeOptional(patch.jobTitle, current.jobTitle),
    email: mergeOptional(patch.email, current.email),
    phone: mergeOptional(patch.phone, current.phone),
    notes: mergeOptional(patch.notes, current.notes),
    isPrimary: patch.isPrimary ?? current.isPrimary,
  });
}

/** Contact vanaf de configurator. Leeg = overslaan; deels ingevuld vereist voornaam. */
export function parseOptionalComposerContactForm(
  formData: FormData,
): ContactInput | null {
  const fields = {
    firstName:
      typeof formData.get("firstName") === "string"
        ? formData.get("firstName")
        : "",
    lastName: formData.get("lastName"),
    email: formData.get("contactEmail"),
    phone: formData.get("contactPhone"),
    isPrimary: true,
  };
  const anyFilled = [
    fields.firstName,
    fields.lastName,
    fields.email,
    fields.phone,
  ].some(hasFilledValue);
  if (!anyFilled) return null;
  return parseContactInput(fields);
}
