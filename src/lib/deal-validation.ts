import { z } from "zod";
import { AppError } from "@/lib/errors";

function emptyToUndefined(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

export const dealSchema = z.object({
  title: z.string().trim().min(1, "Titel is verplicht"),
  companyId: z.preprocess(emptyToUndefined, z.string().optional()),
  contactId: z.preprocess(emptyToUndefined, z.string().optional()),
  stageId: z.string().trim().min(1, "Fase is verplicht"),
  sourceId: z.preprocess(emptyToUndefined, z.string().optional()),
  valueEstimate: z.preprocess((value) => {
    if (value === "" || value === null || value === undefined) return undefined;
    return value;
  }, z.coerce.number().min(0, "Geschatte waarde moet 0 of hoger zijn").optional()),
});

export type DealInput = z.infer<typeof dealSchema>;

export function parseDealForm(formData: FormData): DealInput {
  const parsed = dealSchema.safeParse({
    title: formData.get("title"),
    companyId: formData.get("companyId"),
    contactId: formData.get("contactId"),
    stageId: formData.get("stageId"),
    sourceId: formData.get("sourceId"),
    valueEstimate: formData.get("valueEstimate"),
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    throw new AppError(first?.message ?? "Controleer het formulier.", "VALIDATION");
  }

  return parsed.data;
}

const activityTypes = ["NOTE", "CALL", "EMAIL", "MEETING", "DEMO"] as const;

export const dealActivitySchema = z.object({
  type: z.enum(activityTypes),
  body: z.preprocess(emptyToUndefined, z.string().optional()),
});

export type DealActivityInput = z.infer<typeof dealActivitySchema>;

export function parseDealActivityForm(formData: FormData): DealActivityInput {
  const parsed = dealActivitySchema.safeParse({
    type: formData.get("type"),
    body: formData.get("body"),
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    throw new AppError(first?.message ?? "Controleer het formulier.", "VALIDATION");
  }

  return parsed.data;
}

export const activityTypeLabels = {
  NOTE: "Notitie",
  CALL: "Belletje",
  EMAIL: "E-mail",
  MEETING: "Afspraak",
  DEMO: "Demo",
  STAGE_CHANGE: "Fase gewijzigd",
} as const;
