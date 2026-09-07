"use server";

import { revalidatePath } from "next/cache";
import { isAdminSession, requireAdmin, requireSession } from "@/lib/auth-session";
import { isImageFile } from "@/lib/blob";
import { AppError, toActionError } from "@/lib/errors";
import {
  getStaffBySlug,
  inviteUser,
  sendInvitation,
  setUserActive,
  updateUserImage,
  updateUserRole,
} from "@/lib/user-service";
import {
  parseInviteUserForm,
  parseSetUserActiveForm,
  parseUpdateUserImageForm,
  parseUpdateUserRoleForm,
  parseUserId,
} from "@/lib/user-validation";

function revalidateStaffPaths(slug?: string | null) {
  revalidatePath("/instellingen");
  revalidatePath("/instellingen/medewerkers");
  if (slug) revalidatePath(`/instellingen/medewerkers/${slug}`);
  revalidatePath("/leads");
  revalidatePath("/", "layout");
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

export async function updateUserAvatarAction(
  formData: FormData,
): Promise<{ error?: string }> {
  try {
    const session = await requireSession();
    const { userId, remove } = parseUpdateUserImageForm(formData);
    const file = formData.get("file");
    if (!remove && !isImageFile(file)) {
      throw new AppError("Kies een afbeelding.", "VALIDATION");
    }
    const updated = await updateUserImage(
      userId,
      remove ? null : (file as File),
      {
        userId: session.user.id,
        isAdmin: isAdminSession(session),
      },
    );
    const staff = await getStaffBySlug(updated.id);
    revalidateStaffPaths(staff.slug);
    return {};
  } catch (error) {
    return toActionError(error);
  }
}
