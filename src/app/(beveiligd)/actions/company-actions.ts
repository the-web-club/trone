"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth-session";
import { parseCompanyForm } from "@/lib/company-validation";
import { createCompany, updateCompany } from "@/lib/company-service";
import { toActionError } from "@/lib/errors";

export async function createCompanyAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  try {
    const session = await requireSession();
    const input = parseCompanyForm(formData);
    const company = await createCompany(input, session.user.id);
    revalidatePath("/bedrijven");
    revalidatePath("/overzicht");
    redirect(`/bedrijven/${company.id}`);
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    return toActionError(error);
  }
}

export async function updateCompanyAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  try {
    await requireSession();
    const id = String(formData.get("id") ?? "");
    const input = parseCompanyForm(formData);
    await updateCompany(id, input);
    revalidatePath("/bedrijven");
    revalidatePath(`/bedrijven/${id}`);
    revalidatePath("/overzicht");
    return {};
  } catch (error) {
    return toActionError(error);
  }
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
