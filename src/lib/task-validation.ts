import { z } from "zod";
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
