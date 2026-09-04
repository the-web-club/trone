import { z } from "zod";
import { AppError } from "@/lib/errors";

export const userRoles = ["admin", "user", "viewer"] as const;
export type UserRole = (typeof userRoles)[number];

export const staffStatuses = ["active", "invited", "inactive"] as const;
export type StaffStatus = (typeof staffStatuses)[number];

export const userRoleLabels: Record<UserRole, string> = {
  admin: "Beheerder",
  user: "Medewerker",
  viewer: "Alleen-lezen",
};

function emptyToUndefined(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

export const inviteUserSchema = z.object({
  name: z.string().trim().min(1, "Naam is verplicht"),
  email: z.email("Ongeldig e-mailadres"),
  role: z.enum(userRoles, { error: "Kies een geldige rol" }),
});

export type InviteUserInput = z.infer<typeof inviteUserSchema>;

export function parseInviteUserForm(formData: FormData): InviteUserInput {
  const parsed = inviteUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    throw new AppError(first?.message ?? "Controleer het formulier.", "VALIDATION");
  }

  return parsed.data;
}

export const updateUserRoleSchema = z.object({
  userId: z.string().trim().min(1, "Medewerker ontbreekt"),
  role: z.enum(userRoles, { error: "Kies een geldige rol" }),
});

export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;

export function parseUpdateUserRoleForm(formData: FormData): UpdateUserRoleInput {
  const parsed = updateUserRoleSchema.safeParse({
    userId: formData.get("userId"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    throw new AppError(first?.message ?? "Controleer het formulier.", "VALIDATION");
  }

  return parsed.data;
}

export const setUserActiveSchema = z.object({
  userId: z.string().trim().min(1, "Medewerker ontbreekt"),
  isActive: z.preprocess((value) => {
    if (value === true || value === "true" || value === "1" || value === "on") {
      return true;
    }
    if (value === false || value === "false" || value === "0") {
      return false;
    }
    return emptyToUndefined(value);
  }, z.boolean({ error: "Status is ongeldig" })),
});

export type SetUserActiveInput = z.infer<typeof setUserActiveSchema>;

export function parseSetUserActiveForm(formData: FormData): SetUserActiveInput {
  const parsed = setUserActiveSchema.safeParse({
    userId: formData.get("userId"),
    isActive: formData.get("isActive"),
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    throw new AppError(first?.message ?? "Controleer het formulier.", "VALIDATION");
  }

  return parsed.data;
}

export function parseUserId(formData: FormData): string {
  const parsed = z
    .string()
    .trim()
    .min(1, "Medewerker ontbreekt")
    .safeParse(formData.get("userId"));

  if (!parsed.success) {
    throw new AppError("Medewerker ontbreekt.", "VALIDATION");
  }

  return parsed.data;
}
