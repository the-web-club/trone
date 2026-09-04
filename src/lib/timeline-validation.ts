import { z } from "zod";
import { AppError } from "@/lib/errors";

function emptyToUndefined(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

export const manualTimelineTypes = [
  "NOTE",
  "CALL",
  "EMAIL",
  "MEETING",
  "DEMO",
] as const;

export type ManualTimelineType = (typeof manualTimelineTypes)[number];

export const timelineEventSchema = z
  .object({
    type: z.enum(manualTimelineTypes),
    body: z.preprocess(emptyToUndefined, z.string().optional()),
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
