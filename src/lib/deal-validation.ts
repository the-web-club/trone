import { z } from "zod";
import {
  assertContactBelongsToCompany,
  type ContactCompanyRef,
} from "@/lib/contact-company";
import { AppError } from "@/lib/errors";

/** Als een lead een contact heeft, moet dat contact bij het bedrijf van de lead horen. */
export function assertDealContactCompany(
  contact: ContactCompanyRef | null | undefined,
  companyId: string | null | undefined,
) {
  if (!contact) return;
  assertContactBelongsToCompany(contact, companyId);
}

function emptyToUndefined(value: unknown): unknown {
  if (value == null) return undefined;
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

export type DealPatch = {
  title?: string;
  companyId?: string | null;
  contactId?: string | null;
  stageId?: string;
  sourceId?: string | null;
  valueEstimate?: number | null;
};

export type DealFieldName =
  | "title"
  | "companyId"
  | "contactId"
  | "stageId"
  | "sourceId"
  | "valueEstimate"
  | "submissionId";

export type DealFieldErrors = Partial<Record<DealFieldName, string>>;

export const DEAL_FIELD_ORDER = [
  "title",
  "companyId",
  "contactId",
  "stageId",
  "sourceId",
  "valueEstimate",
] as const satisfies readonly DealFieldName[];

export function firstInvalidDealField(
  errors: DealFieldErrors,
): DealFieldName | undefined {
  return DEAL_FIELD_ORDER.find((field) => errors[field]);
}

export function fieldErrorsFromZod(error: z.ZodError): DealFieldErrors {
  const fields: DealFieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && fields[key as DealFieldName] == null) {
      fields[key as DealFieldName] = issue.message;
    }
  }
  return fields;
}

export type ParsedDealForm =
  | { success: true; data: DealInput }
  | { success: false; fieldErrors: DealFieldErrors; formError: string };

function dealFormValues(formData: FormData) {
  return {
    title: formData.get("title"),
    companyId: formData.get("companyId"),
    contactId: formData.get("contactId"),
    stageId: formData.get("stageId"),
    sourceId: formData.get("sourceId"),
    valueEstimate: formData.get("valueEstimate"),
  };
}

export function safeParseDealForm(formData: FormData): ParsedDealForm {
  const parsed = dealSchema.safeParse(dealFormValues(formData));
  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: fieldErrorsFromZod(parsed.error),
      formError: parsed.error.issues[0]?.message ?? "Controleer het formulier.",
    };
  }
  return { success: true, data: parsed.data };
}

export const dealTitleSchema = dealSchema.pick({ title: true });

export function safeParseDealTitleForm(
  formData: FormData,
): { success: true } | { success: false; fieldErrors: DealFieldErrors; formError: string } {
  const parsed = dealTitleSchema.safeParse({ title: formData.get("title") });
  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: fieldErrorsFromZod(parsed.error),
      formError: parsed.error.issues[0]?.message ?? "Controleer het formulier.",
    };
  }
  return { success: true };
}

function parseDealInput(data: unknown): DealInput {
  const parsed = dealSchema.safeParse(data);
  if (!parsed.success) {
    const fieldErrors = fieldErrorsFromZod(parsed.error);
    const first = parsed.error.issues[0];
    throw new AppError(
      first?.message ?? "Controleer het formulier.",
      "VALIDATION",
      400,
      fieldErrors,
    );
  }
  return parsed.data;
}

export function parseDealForm(formData: FormData): DealInput {
  const parsed = safeParseDealForm(formData);
  if (!parsed.success) {
    throw new AppError(parsed.formError, "VALIDATION", 400, parsed.fieldErrors);
  }
  return parsed.data;
}

export function dealRecordToInput(deal: {
  title: string;
  companyId: string | null;
  contactId: string | null;
  stageId: string;
  sourceId: string | null;
  valueEstimate?: { toString(): string } | number | string | null;
}): DealInput {
  const raw = deal.valueEstimate;
  let valueEstimate: number | undefined;
  if (raw != null && raw !== "") {
    const parsed = Number(typeof raw === "object" ? raw.toString() : raw);
    if (!Number.isNaN(parsed)) valueEstimate = parsed;
  }

  return parseDealInput({
    title: deal.title,
    companyId: deal.companyId ?? undefined,
    contactId: deal.contactId ?? undefined,
    stageId: deal.stageId,
    sourceId: deal.sourceId ?? undefined,
    valueEstimate,
  });
}

export function dealCreationMatches(
  existing: {
    title: string;
    companyId?: string | null;
    contactId?: string | null;
    stageId: string;
    sourceId?: string | null;
    valueEstimate?: { toString(): string } | number | string | null;
  },
  input: DealInput,
): boolean {
  const raw = existing.valueEstimate;
  let existingValue: number | null = null;
  if (raw != null && raw !== "") {
    const parsed = Number(typeof raw === "object" ? raw.toString() : raw);
    if (!Number.isNaN(parsed)) existingValue = parsed;
  }

  return (
    existing.title === input.title &&
    (existing.companyId ?? null) === (input.companyId ?? null) &&
    (existing.contactId ?? null) === (input.contactId ?? null) &&
    existing.stageId === input.stageId &&
    (existing.sourceId ?? null) === (input.sourceId ?? null) &&
    existingValue === (input.valueEstimate ?? null)
  );
}

export function mergeDealPatch(current: DealInput, patch: DealPatch): DealInput {
  return parseDealInput({
    title: patch.title ?? current.title,
    companyId:
      patch.companyId !== undefined
        ? (patch.companyId ?? undefined)
        : current.companyId,
    contactId:
      patch.contactId !== undefined
        ? (patch.contactId ?? undefined)
        : current.contactId,
    stageId: patch.stageId ?? current.stageId,
    sourceId:
      patch.sourceId !== undefined
        ? (patch.sourceId ?? undefined)
        : current.sourceId,
    valueEstimate:
      patch.valueEstimate !== undefined
        ? (patch.valueEstimate ?? undefined)
        : current.valueEstimate,
  });
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
