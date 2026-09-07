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
import {
  companyPath,
  contactPath,
  dealPath,
  quoteEditPath,
  quotePath,
} from "@/lib/paths";

function isNextRedirect(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    String((error as { digest: string }).digest).startsWith("NEXT_REDIRECT")
  );
}

function revalidateQuotePaths(quote?: {
  quoteNumber: string;
  company?: { slug: string } | null;
  deal?: { slug: string } | null;
  contact?: { slug: string } | null;
}) {
  revalidatePath("/offertes", "layout");
  revalidatePath("/overzicht");
  revalidatePath("/leads", "layout");
  revalidatePath("/bedrijven", "layout");
  revalidatePath("/contacten", "layout");
  if (quote) {
    revalidatePath(quotePath(quote));
    revalidatePath(quoteEditPath(quote));
    if (quote.company) revalidatePath(companyPath(quote.company));
    if (quote.deal) revalidatePath(dealPath(quote.deal));
    if (quote.contact) revalidatePath(contactPath(quote.contact));
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
    revalidateQuotePaths(quote);
    redirect(quotePath(quote));
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
    const quote = await editDraft(id, input, session.user.id);
    revalidateQuotePaths(quote);
    redirect(quotePath(quote));
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
    const quote = await sendQuote(id, session.user.id);
    revalidateQuotePaths(quote);
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
    const quote = await createRevision(id);
    revalidateQuotePaths(quote);
    redirect(quoteEditPath(quote));
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
    const session = await requireSession();
    const id = parseQuoteId(formData);
    const status = parseQuoteOutcomeForm(formData);
    const quote = await updateQuoteStatus(id, status, session.user.id);
    revalidateQuotePaths(quote);
    return {};
  } catch (error) {
    return toActionError(error);
  }
}
