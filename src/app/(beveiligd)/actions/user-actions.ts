"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth-session";
import { toActionError } from "@/lib/errors";
import {
  inviteUser,
  sendInvitation,
  setUserActive,
  updateUserRole,
} from "@/lib/user-service";
import {
  parseInviteUserForm,
  parseSetUserActiveForm,
  parseUpdateUserRoleForm,
  parseUserId,
} from "@/lib/user-validation";

function revalidateStaffPaths() {
  revalidatePath("/instellingen");
  revalidatePath("/instellingen/medewerkers");
}

export async function inviteUserAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  try {
    await requireAdmin();
    const input = parseInviteUserForm(formData);
    await inviteUser(input);
    revalidateStaffPaths();
    return {};
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateUserRoleAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  try {
    const session = await requireAdmin();
    const input = parseUpdateUserRoleForm(formData);
    await updateUserRole(input.userId, input.role, session.user.id);
    revalidateStaffPaths();
    return {};
  } catch (error) {
    return toActionError(error);
  }
}

export async function setUserActiveAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  try {
    const session = await requireAdmin();
    const input = parseSetUserActiveForm(formData);
    await setUserActive(input.userId, input.isActive, session.user.id);
    revalidateStaffPaths();
    return {};
  } catch (error) {
    return toActionError(error);
  }
}

export async function resendInvitationAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  try {
    await requireAdmin();
    const userId = parseUserId(formData);
    await sendInvitation(userId);
    revalidateStaffPaths();
    return {};
  } catch (error) {
    return toActionError(error);
  }
}
