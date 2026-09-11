import { z } from "zod";
import { AppError } from "@/lib/errors";
import { normalizeRichText } from "@/lib/rich-text";

function emptyToUndefined(value: unknown): unknown {
  if (value == null) return undefined;
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

function optionalRichText(value: unknown): unknown {
  if (value == null) return undefined;
  if (typeof value !== "string") return value;
  return normalizeRichText(value);
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

export const timelineEventSchema = z
  .object({
    type: z.enum(manualTimelineTypes),
    body: z.preprocess(
      optionalRichText,
      z.string().max(20_000, "Toelichting is te lang.").optional(),
    ),
    dealId: z.preprocess(emptyToUndefined, z.string().optional()),
    contactId: z.preprocess(emptyToUndefined, z.string().optional()),
    companyId: z.preprocess(emptyToUndefined, z.string().optional()),
  })
  .refine(
    (value) => Boolean(value.dealId || value.contactId || value.companyId),
    { message: "Koppel minstens één lead, contact of bedrijf." },
  );

export type TimelineEventInput = z.infer<typeof timelineEventSchema>;

export function parseTimelineEventForm(formData: FormData): TimelineEventInput {
  const parsed = timelineEventSchema.safeParse({
    type: formData.get("type"),
    body: formData.get("body"),
    dealId: formData.get("dealId"),
    contactId: formData.get("contactId"),
    companyId: formData.get("companyId"),
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    throw new AppError(first?.message ?? "Controleer het formulier.", "VALIDATION");
  }

  return parsed.data;
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
  CALL: "Belletje",
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

export type TimelineEventView = {
  id: string;
  type: keyof typeof timelineEventTypeLabels;
  body: string | null;
  occurredAt: Date | string;
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
