"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, requireSession } from "@/lib/auth-session";
import { parseContactForm } from "@/lib/contact-validation";
import {
  createContact,
  deleteContact,
  listContactsForSelect,
  updateContact,
} from "@/lib/contact-service";
import { toActionError } from "@/lib/errors";
import { companyPath, contactPath } from "@/lib/paths";

export async function createContactAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{
  error?: string;
  contact?: {
    id: string;
    slug: string;
    firstName: string;
    lastName: string | null;
    companyId: string | null;
  };
}> {
  try {
    await requireSession();
    const companyId = String(formData.get("companyId") ?? "");
    const input = parseContactForm(formData);
    const contact = await createContact(companyId, input);
    revalidatePath("/bedrijven");
    revalidatePath("/bedrijven/[slug]", "page");
    revalidatePath("/contacten");
    revalidatePath("/contacten/[slug]", "page");
    revalidatePath(contactPath(contact));
    return {
      contact: {
        id: contact.id,
        slug: contact.slug,
        firstName: contact.firstName,
        lastName: contact.lastName,
        companyId: contact.companyId,
      },
    };
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
    const contact = await updateContact(id, companyId, input);
    revalidatePath("/bedrijven", "layout");
    revalidatePath("/contacten", "layout");
    revalidatePath(contactPath(contact));
    return {};
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteContactAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  try {
    await requireAdmin();
    const id = String(formData.get("id") ?? "");
    const contact = await deleteContact(id);
    revalidatePath("/contacten", "layout");
    revalidatePath("/bedrijven", "layout");
    revalidatePath("/leads", "layout");
    revalidatePath("/overzicht");
    redirect(contact.company ? companyPath(contact.company) : "/contacten");
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    return toActionError(error);
  }
}

export async function listContactsForSelectAction(companyId?: string | null) {
  await requireSession();
  return listContactsForSelect(companyId);
}

function isNextRedirect(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    String((error as { digest: string }).digest).startsWith("NEXT_REDIRECT")
  );
}
