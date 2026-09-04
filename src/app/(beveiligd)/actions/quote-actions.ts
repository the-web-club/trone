"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth-session";
import { toActionError } from "@/lib/errors";
import {
  createQuote,
  createRevision,
  editDraft,
  sendQuote,
  updateQuoteStatus,
} from "@/lib/quote-service";
import {
  parseQuoteForm,
  parseQuoteId,
  parseQuoteOutcomeForm,
} from "@/lib/quote-validation";

function isNextRedirect(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    String((error as { digest: string }).digest).startsWith("NEXT_REDIRECT")
  );
}

function revalidateQuotePaths(quoteId?: string) {
  revalidatePath("/offertes");
  revalidatePath("/overzicht");
  if (quoteId) {
    revalidatePath(`/offertes/${quoteId}`);
    revalidatePath(`/offertes/${quoteId}/bewerken`);
  }
}

export async function createQuoteAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  try {
    const session = await requireSession();
    const input = parseQuoteForm(formData);
    const quote = await createQuote(input, session.user.id);
    revalidateQuotePaths(quote.id);
    redirect(`/offertes/${quote.id}`);
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    return toActionError(error);
  }
}

export async function updateQuoteAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  try {
    const session = await requireSession();
    const id = parseQuoteId(formData);
    const input = parseQuoteForm(formData);
    await editDraft(id, input, session.user.id);
    revalidateQuotePaths(id);
    redirect(`/offertes/${id}`);
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    return toActionError(error);
  }
}

export async function sendQuoteAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  try {
    const session = await requireSession();
    const id = parseQuoteId(formData);
    await sendQuote(id, session.user.id);
    revalidateQuotePaths(id);
    return {};
  } catch (error) {
    return toActionError(error);
  }
}

export async function createRevisionAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  try {
    await requireSession();
    const id = parseQuoteId(formData);
    await createRevision(id);
    revalidateQuotePaths(id);
    redirect(`/offertes/${id}/bewerken`);
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    return toActionError(error);
  }
}

export async function updateQuoteStatusAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  try {
    await requireSession();
    const id = parseQuoteId(formData);
    const status = parseQuoteOutcomeForm(formData);
    await updateQuoteStatus(id, status);
    revalidateQuotePaths(id);
    return {};
  } catch (error) {
    return toActionError(error);
  }
}
