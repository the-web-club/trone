import { z } from "zod";
import {
  normalizeDateOnlyInput,
  normalizeTimeInput,
  zonedLocalToUtc,
} from "@/lib/date-input";
import { AppError } from "@/lib/errors";
import { normalizeRichText } from "@/lib/rich-text";
import {
  DEFAULT_FOLLOW_UP_TITLE,
  taskKinds,
  type FollowUpInput,
} from "@/lib/task-validation";

function emptyToUndefined(value: unknown): unknown {
  if (value == null) return undefined;
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed === "" || trimmed === "__none" ? undefined : trimmed;
}

function optionalRichText(value: unknown): unknown {
  if (value == null) return undefined;
  if (typeof value !== "string") return value;
  return normalizeRichText(value);
}

function isChecked(value: unknown): boolean {
  if (value === true) return true;
  if (typeof value !== "string") return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "on" || normalized === "true" || normalized === "1";
}

export const manualTimelineTypes = [
  "NOTE",
  "CALL",
  "EMAIL",
  "MEETING",
  "DEMO",
] as const;

export type ManualTimelineType = (typeof manualTimelineTypes)[number];

export function isManualTimelineType(
  type: string,
): type is ManualTimelineType {
  return (manualTimelineTypes as readonly string[]).includes(type);
}

export const timelineDirections = ["INBOUND", "OUTBOUND"] as const;
export type TimelineDirection = (typeof timelineDirections)[number];

export const timelineOutcomes = [
  "CONNECTED",
  "NO_ANSWER",
  "VOICEMAIL",
  "BUSY",
  "WRONG_NUMBER",
] as const;
export type TimelineOutcome = (typeof timelineOutcomes)[number];

function parseOptionalDateTime(
  dateValue: unknown,
  timeValue: unknown,
  {
    requiredMessage,
    timeRequired = false,
  }: { requiredMessage?: string; timeRequired?: boolean } = {},
): Date | undefined {
  const rawDate = typeof dateValue === "string" ? dateValue.trim() : "";
  const rawTime = typeof timeValue === "string" ? timeValue.trim() : "";
  if (!rawDate && !rawTime) {
    if (requiredMessage) throw new AppError(requiredMessage, "VALIDATION");
    return undefined;
  }
  if (!rawDate) {
    throw new AppError("Vul een datum in.", "VALIDATION");
  }
  const day = normalizeDateOnlyInput(rawDate);
  if (!day) {
    throw new AppError("Datum is ongeldig.", "VALIDATION");
  }
  if (rawTime) {
    const clock = normalizeTimeInput(rawTime);
    if (!clock) {
      throw new AppError("Tijd is ongeldig.", "VALIDATION");
    }
    const parsed = zonedLocalToUtc(day, clock);
    if (!parsed) throw new AppError("Datum is ongeldig.", "VALIDATION");
    return parsed;
  }
  if (timeRequired) {
    throw new AppError("Vul een tijd in, of kies alleen datum.", "VALIDATION");
  }
  const parsed = zonedLocalToUtc(day, "00:00");
  if (!parsed) throw new AppError("Datum is ongeldig.", "VALIDATION");
  return parsed;
}

export const timelineEventSchema = z
  .object({
    type: z.enum(manualTimelineTypes),
    direction: z.preprocess(
      emptyToUndefined,
      z.enum(timelineDirections).optional(),
    ),
    outcome: z.preprocess(
      emptyToUndefined,
      z.enum(timelineOutcomes).optional(),
    ),
    body: z.preprocess(
      optionalRichText,
      z.string().max(20_000, "Toelichting is te lang.").optional(),
    ),
    dealId: z.preprocess(emptyToUndefined, z.string().optional()),
    contactId: z.preprocess(emptyToUndefined, z.string().optional()),
    companyId: z.preprocess(emptyToUndefined, z.string().optional()),
    occurredDate: z.preprocess(emptyToUndefined, z.string().optional()),
    occurredTime: z.preprocess(emptyToUndefined, z.string().optional()),
    followUpKind: z.preprocess(emptyToUndefined, z.enum(taskKinds).optional()),
    followUpTitle: z.preprocess(emptyToUndefined, z.string().optional()),
    followUpDate: z.preprocess(emptyToUndefined, z.string().optional()),
    followUpTime: z.preprocess(emptyToUndefined, z.string().optional()),
    followUpDateOnly: z.boolean().optional(),
  })
  .refine(
    (value) => Boolean(value.dealId || value.contactId || value.companyId),
    { message: "Koppel minstens één lead, contact of bedrijf." },
  );

export type TimelineEventInput = z.infer<typeof timelineEventSchema> & {
  occurredAt?: Date;
  followUp?: FollowUpInput;
};

export function parseTimelineEventForm(formData: FormData): TimelineEventInput {
  const parsed = timelineEventSchema.safeParse({
    type: formData.get("type"),
    direction: formData.get("direction"),
    outcome: formData.get("outcome"),
    body: formData.get("body"),
    dealId: formData.get("dealId"),
    contactId: formData.get("contactId"),
    companyId: formData.get("companyId"),
    occurredDate: formData.get("occurredDate"),
    occurredTime: formData.get("occurredTime"),
    followUpKind: formData.get("followUpKind"),
    followUpTitle: formData.get("followUpTitle"),
    followUpDate: formData.get("followUpDate"),
    followUpTime: formData.get("followUpTime"),
    followUpDateOnly: isChecked(formData.get("followUpDateOnly")),
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    throw new AppError(first?.message ?? "Controleer het formulier.", "VALIDATION");
  }

  const occurredAt = parseOptionalDateTime(
    parsed.data.occurredDate,
    parsed.data.occurredTime,
  );

  const followUpDate = parsed.data.followUpDate;
  const followUpTitle = parsed.data.followUpTitle?.trim();
  const followUpKind = parsed.data.followUpKind ?? "FOLLOW_UP";
  let followUp: FollowUpInput | undefined;
  if (followUpDate) {
    const dueDateOnly = Boolean(parsed.data.followUpDateOnly);
    const dueAt = parseOptionalDateTime(
      followUpDate,
      dueDateOnly ? undefined : parsed.data.followUpTime,
      {
        requiredMessage: "Vul een datum in voor de vervolgactie.",
        timeRequired: !dueDateOnly,
      },
    );
    if (!dueAt) {
      throw new AppError("Vul een datum in voor de vervolgactie.", "VALIDATION");
    }
    followUp = {
      kind: followUpKind,
      title: followUpTitle || DEFAULT_FOLLOW_UP_TITLE,
      dueAt,
      dueDateOnly,
    };
  } else if (followUpTitle && followUpTitle !== DEFAULT_FOLLOW_UP_TITLE) {
    throw new AppError("Vul een datum in voor de vervolgactie.", "VALIDATION");
  }

  return {
    ...parsed.data,
    occurredAt,
    followUp,
  };
}

export const updateTimelineEventSchema = z.object({
  id: z.string().trim().min(1, "Gebeurtenis ontbreekt"),
  type: z.enum(manualTimelineTypes),
  body: z.preprocess(
    optionalRichText,
    z.string().max(20_000, "Toelichting is te lang.").optional(),
  ),
});

export type UpdateTimelineEventInput = z.infer<typeof updateTimelineEventSchema>;

export function parseUpdateTimelineEventForm(
  formData: FormData,
): UpdateTimelineEventInput {
  const parsed = updateTimelineEventSchema.safeParse({
    id: formData.get("id"),
    type: formData.get("type"),
    body: formData.get("body"),
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    throw new AppError(first?.message ?? "Controleer het formulier.", "VALIDATION");
  }

  return parsed.data;
}

export function parseTimelineEventId(formData: FormData): string {
  const parsed = z
    .string()
    .trim()
    .min(1, "Gebeurtenis ontbreekt")
    .safeParse(formData.get("id"));

  if (!parsed.success) {
    throw new AppError("Gebeurtenis ontbreekt.", "VALIDATION");
  }

  return parsed.data;
}

export const timelineEventTypeLabels = {
  NOTE: "Notitie",
  CALL: "Telefoon",
  EMAIL: "E-mail",
  MEETING: "Afspraak",
  DEMO: "Demo",
  STAGE_CHANGE: "Fase gewijzigd",
  QUOTE_SENT: "Offerte verstuurd",
  QUOTE_ACCEPTED: "Offerte geaccepteerd",
  ORDER_CREATED: "Order aangemaakt",
  ORDER_STATUS: "Orderstatus",
  TASK_DUE: "Taak gepland",
  TASK_DONE: "Taak afgerond",
  SYSTEM: "Systeem",
} as const;

export const timelineDirectionLabels: Record<TimelineDirection, string> = {
  INBOUND: "Inkomend",
  OUTBOUND: "Uitgaand",
};

export const timelineOutcomeLabels: Record<TimelineOutcome, string> = {
  CONNECTED: "Bereikt",
  NO_ANSWER: "Niet opgenomen",
  VOICEMAIL: "Voicemail",
  BUSY: "In gesprek",
  WRONG_NUMBER: "Verkeerd nummer",
};

export type TimelineEventView = {
  id: string;
  type: keyof typeof timelineEventTypeLabels;
  body: string | null;
  occurredAt: Date | string;
  direction?: TimelineDirection | null;
  outcome?: TimelineOutcome | null;
  user: {
    id: string;
    name: string;
    image: string | null;
    slug: string | null;
  } | null;
  quote: { id: string; quoteNumber: string } | null;
  order: { id: string; orderNumber: string } | null;
  deal: { id: string; slug: string; title: string } | null;
  contact: {
    id: string;
    slug: string;
    firstName: string;
    lastName: string | null;
  } | null;
  company: { id: string; slug: string; name: string } | null;
};
