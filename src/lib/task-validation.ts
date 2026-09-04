import { z } from "zod";
import { AppError } from "@/lib/errors";
import { normalizeDateOnlyInput } from "@/lib/date-input";

function emptyToUndefined(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

export const taskStatuses = ["OPEN", "DONE", "CANCELLED"] as const;
export type TaskStatusValue = (typeof taskStatuses)[number];

export const taskPriorities = ["LOW", "NORMAL", "HIGH"] as const;
export type TaskPriorityValue = (typeof taskPriorities)[number];

export const taskStatusLabels = {
  OPEN: "Open",
  DONE: "Afgerond",
  CANCELLED: "Geannuleerd",
} as const;

export const taskPriorityLabels = {
  LOW: "Laag",
  NORMAL: "Normaal",
  HIGH: "Hoog",
} as const;

export const taskSchema = z.object({
  title: z.string().trim().min(1, "Titel is verplicht"),
  description: z.preprocess(emptyToUndefined, z.string().optional()),
  dueAt: z.preprocess((value) => {
    if (typeof value !== "string") return undefined;
    return normalizeDateOnlyInput(value) ?? undefined;
  }, z.string().optional()),
  priority: z.preprocess(
    emptyToUndefined,
    z.enum(taskPriorities).optional(),
  ),
  assigneeUserId: z.string().trim().min(1, "Kies een medewerker"),
  dealId: z.preprocess(emptyToUndefined, z.string().optional()),
  contactId: z.preprocess(emptyToUndefined, z.string().optional()),
  companyId: z.preprocess(emptyToUndefined, z.string().optional()),
});

export type TaskInput = z.infer<typeof taskSchema>;

export function parseTaskForm(formData: FormData): TaskInput {
  const parsed = taskSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    dueAt: formData.get("dueAt"),
    priority: formData.get("priority"),
    assigneeUserId: formData.get("assigneeUserId"),
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

export function parseTaskId(formData: FormData): string {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) {
    throw new AppError("Taak ontbreekt.", "VALIDATION");
  }
  return id;
}
