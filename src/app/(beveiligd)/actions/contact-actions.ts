"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth-session";
import { parseContactForm } from "@/lib/contact-validation";
import { createContact, updateContact } from "@/lib/contact-service";
import { toActionError } from "@/lib/errors";

export async function createContactAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  try {
    await requireSession();
    const companyId = String(formData.get("companyId") ?? "");
    const input = parseContactForm(formData);
    const contact = await createContact(companyId, input);
    revalidatePath(`/bedrijven/${companyId}`);
    revalidatePath("/bedrijven");
    revalidatePath("/contacten");
    revalidatePath(`/contacten/${contact.id}`);
    return {};
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateContactAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  try {
    await requireSession();
    const id = String(formData.get("id") ?? "");
    const companyId = String(formData.get("companyId") ?? "");
    const input = parseContactForm(formData);
    await updateContact(id, companyId, input);
    revalidatePath(`/bedrijven/${companyId}`);
    revalidatePath("/bedrijven");
    revalidatePath("/contacten");
    revalidatePath(`/contacten/${id}`);
    return {};
  } catch (error) {
    return toActionError(error);
  }
}
