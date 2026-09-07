"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth-session";
import { parseContactForm } from "@/lib/contact-validation";
import {
  createContact,
  listContactsForSelect,
  updateContact,
} from "@/lib/contact-service";
import { toActionError } from "@/lib/errors";
import { contactPath } from "@/lib/paths";

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

export async function listContactsForSelectAction(companyId?: string | null) {
  await requireSession();
  return listContactsForSelect(companyId);
}
