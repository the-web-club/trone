import { z } from "zod";
import {
  normalizeDateOnlyInput,
  normalizeTimeInput,
  zonedLocalToUtc,
} from "@/lib/date-input";
import { AppError } from "@/lib/errors";

export const taskKinds = ["FOLLOW_UP"] as const;
export type TaskKind = (typeof taskKinds)[number];

export const DEFAULT_FOLLOW_UP_TITLE = "Prospect opvolgen";

export const taskKindLabels: Record<TaskKind, string> = {
  FOLLOW_UP: "Opvolging",
};

export const taskStatuses = ["OPEN", "DONE", "CANCELLED"] as const;
export type TaskStatusValue = (typeof taskStatuses)[number];

export const taskStatusLabels: Record<TaskStatusValue, string> = {
  OPEN: "Open",
  DONE: "Afgerond",
  CANCELLED: "Geannuleerd",
};

export const taskStatusTones = {
  OPEN: "warning",
  DONE: "success",
  CANCELLED: "default",
} as const;

export type FollowUpInput = {
  kind: TaskKind;
  title: string;
  dueAt: Date;
  dueDateOnly: boolean;
};

function emptyToUndefined(value: unknown): unknown {
  if (value == null) return undefined;
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed === "" || trimmed === "__none" ? undefined : trimmed;
}

function isChecked(value: unknown): boolean {
  if (value === true) return true;
  if (typeof value !== "string") return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "on" || normalized === "true" || normalized === "1";
}

function parseDueAt(
  dateValue: string,
  timeValue: string | undefined,
  dueDateOnly: boolean,
): Date {
  const day = normalizeDateOnlyInput(dateValue);
  if (!day) {
    throw new AppError("Datum is ongeldig.", "VALIDATION");
  }
  if (dueDateOnly) {
    const parsed = zonedLocalToUtc(day, "00:00");
    if (!parsed) throw new AppError("Datum is ongeldig.", "VALIDATION");
    return parsed;
  }
  if (!timeValue) {
    throw new AppError("Vul een tijd in, of kies alleen datum.", "VALIDATION");
  }
  const clock = normalizeTimeInput(timeValue);
  if (!clock) {
    throw new AppError("Tijd is ongeldig.", "VALIDATION");
  }
  const parsed = zonedLocalToUtc(day, clock);
  if (!parsed) throw new AppError("Datum is ongeldig.", "VALIDATION");
  return parsed;
}

export function buildFollowUpInput(input: {
  kind?: TaskKind;
  title?: string;
  date?: string;
  time?: string;
  dateOnly?: boolean;
  required?: boolean;
}): FollowUpInput | undefined {
  const title = input.title?.trim();
  const date = input.date?.trim() || undefined;
  if (!date) {
    if (input.required || (title && title !== DEFAULT_FOLLOW_UP_TITLE)) {
      throw new AppError("Vul een datum in voor de vervolgactie.", "VALIDATION");
    }
    return undefined;
  }

  const dueDateOnly = Boolean(input.dateOnly);
  return {
    kind: input.kind ?? "FOLLOW_UP",
    title: title || DEFAULT_FOLLOW_UP_TITLE,
    dueAt: parseDueAt(date, input.time, dueDateOnly),
    dueDateOnly,
  };
}

const createFollowUpSchema = z
  .object({
    kind: z.preprocess(emptyToUndefined, z.enum(taskKinds).optional()),
    title: z.preprocess(emptyToUndefined, z.string().optional()),
    date: z.preprocess(emptyToUndefined, z.string().optional()),
    time: z.preprocess(emptyToUndefined, z.string().optional()),
    dateOnly: z.boolean().optional(),
    dealId: z.preprocess(emptyToUndefined, z.string().optional()),
    contactId: z.preprocess(emptyToUndefined, z.string().optional()),
    companyId: z.preprocess(emptyToUndefined, z.string().optional()),
  })
  .refine(
    (value) => Boolean(value.dealId || value.contactId || value.companyId),
    { message: "Koppel minstens één lead, contact of bedrijf." },
  );

export type CreateFollowUpFormInput = FollowUpInput & {
  dealId?: string;
  contactId?: string;
  companyId?: string;
};

export function parseCreateFollowUpForm(
  formData: FormData,
): CreateFollowUpFormInput {
  const parsed = createFollowUpSchema.safeParse({
    kind: formData.get("followUpKind"),
    title: formData.get("followUpTitle"),
    date: formData.get("followUpDate"),
    time: formData.get("followUpTime"),
    dateOnly: isChecked(formData.get("followUpDateOnly")),
    dealId: formData.get("dealId"),
    contactId: formData.get("contactId"),
    companyId: formData.get("companyId"),
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    throw new AppError(
      first?.message ?? "Controleer het formulier.",
      "VALIDATION",
    );
  }

  const followUp = buildFollowUpInput({
    kind: parsed.data.kind,
    title: parsed.data.title,
    date: parsed.data.date,
    time: parsed.data.time,
    dateOnly: parsed.data.dateOnly,
    required: true,
  });
  if (!followUp) {
    throw new AppError("Vul een datum in voor de vervolgactie.", "VALIDATION");
  }

  return {
    ...followUp,
    dealId: parsed.data.dealId,
    contactId: parsed.data.contactId,
    companyId: parsed.data.companyId,
  };
}

export function parseTaskId(formData: FormData): string {
  const parsed = z
    .string()
    .trim()
    .min(1, "Taak ontbreekt")
    .safeParse(formData.get("id"));

  if (!parsed.success) {
    throw new AppError("Taak ontbreekt.", "VALIDATION");
  }

  return parsed.data;
}
