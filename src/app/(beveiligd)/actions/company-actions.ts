"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, requireSession } from "@/lib/auth-session";
import {
  companyRecordToInput,
  mergeCompanyPatch,
  parseCompanyForm,
  parseComposerCompanyForm,
  type CompanyPatch,
} from "@/lib/company-validation";
import {
  createCompany,
  deleteCompany,
  getCompany,
  updateCompany,
  validateCompanyVat,
} from "@/lib/company-service";
import { toActionError } from "@/lib/errors";
import { companyPath } from "@/lib/paths";
import type { VatRegime, ViesStatus } from "@/lib/vat";

export type CreatedCompanyOption = {
  id: string;
  slug: string;
  name: string;
};

/** Compact aanmaken zonder redirect, voor selects op lead en offerte. */
export async function createCompanyInlineAction(
  formData: FormData,
): Promise<{ error?: string; company?: CreatedCompanyOption }> {
  try {
    const session = await requireSession();
    const input = parseComposerCompanyForm(formData);
    const company = await createCompany(input, session.user.id);
    revalidatePath("/bedrijven", "layout");
    revalidatePath("/overzicht");
    revalidatePath("/leads", "layout");
    return {
      company: {
        id: company.id,
        slug: company.slug,
        name: company.name,
      },
    };
  } catch (error) {
    return toActionError(error);
  }
}

export async function createCompanyAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  try {
    const session = await requireSession();
    const input = parseCompanyForm(formData);
    const company = await createCompany(input, session.user.id);
    revalidatePath("/bedrijven", "layout");
    revalidatePath("/overzicht");
    redirect(companyPath(company));
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
    const company = await updateCompany(id, input);
    revalidatePath("/bedrijven", "layout");
    revalidatePath(companyPath(company));
    revalidatePath("/overzicht");
    return {};
  } catch (error) {
    return toActionError(error);
  }
}

export async function patchCompanyAction(
  companyId: string,
  patch: CompanyPatch,
): Promise<{ error?: string; slug?: string }> {
  try {
    await requireSession();
    const current = await getCompany(companyId);
    const input = mergeCompanyPatch(companyRecordToInput(current), patch);
    const company = await updateCompany(current.id, input);
    revalidatePath("/bedrijven", "layout");
    revalidatePath(companyPath(company));
    revalidatePath("/overzicht");
    return { slug: company.slug };
  } catch (error) {
    return toActionError(error);
  }
}

export type ValidateCompanyVatResult = {
  error?: string;
  status?: ViesStatus;
  name?: string | null;
  checkedAt?: string | null;
  vatRate?: number;
  vatRegime?: VatRegime;
  warning?: string | null;
  mention?: string | null;
  needsConfirmation?: boolean;
  appliedVatRate?: number | null;
};

export async function deleteCompanyAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  try {
    await requireAdmin();
    const id = String(formData.get("id") ?? "");
    await deleteCompany(id);
    revalidatePath("/bedrijven", "layout");
    revalidatePath("/contacten", "layout");
    revalidatePath("/leads", "layout");
    revalidatePath("/overzicht");
    revalidatePath("/kansen");
    revalidatePath("/logboek");
    redirect("/bedrijven");
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    return toActionError(error);
  }
}

export async function validateCompanyVatAction(
  formData: FormData,
): Promise<ValidateCompanyVatResult> {
  try {
    await requireSession();
    const id = String(formData.get("id") ?? "").trim();
    if (!id) {
      return { error: "Bedrijf ontbreekt." };
    }
    const applyProposedRate =
      formData.get("applyProposedRate") === "true" ||
      formData.get("applyProposedRate") === "1";
    const vatNumber = String(formData.get("vatNumber") ?? "").trim() || null;
    const country =
      String(formData.get("country") ?? "").trim().toUpperCase() || null;
    const { company, result, treatment, needsConfirmation, appliedVatRate } =
      await validateCompanyVat(id, {
        vatNumber,
        country,
        applyProposedRate,
      });
    revalidatePath("/bedrijven", "layout");
    revalidatePath(companyPath(company));
    revalidatePath("/offertes", "layout");
    return {
      status: result.status,
      name: result.name,
      checkedAt: result.checkedAt,
      vatRate: treatment.vatRate,
      vatRegime: treatment.vatRegime,
      warning: treatment.warning,
      mention: treatment.mention,
      needsConfirmation,
      appliedVatRate,
    };
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
