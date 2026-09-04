"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth-session";
import {
  addDealActivity,
  createDeal,
  moveDealToStage,
  setDealHot,
  updateDeal,
} from "@/lib/deal-service";
import { parseDealActivityForm, parseDealForm } from "@/lib/deal-validation";
import { toActionError } from "@/lib/errors";

function isNextRedirect(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    String((error as { digest: string }).digest).startsWith("NEXT_REDIRECT")
  );
}

function revalidateDealPaths(dealId?: string) {
  revalidatePath("/leads");
  revalidatePath("/overzicht");
  if (dealId) revalidatePath(`/leads/${dealId}`);
}

export async function createDealAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  try {
    const session = await requireSession();
    const input = parseDealForm(formData);
    const deal = await createDeal(input, session.user.id);
    revalidateDealPaths(deal.id);
    redirect(`/leads/${deal.id}`);
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    return toActionError(error);
  }
}

export async function updateDealAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  try {
    const session = await requireSession();
    const id = String(formData.get("id") ?? "");
    const input = parseDealForm(formData);
    await updateDeal(id, input, session.user.id);
    revalidateDealPaths(id);
    return {};
  } catch (error) {
    return toActionError(error);
  }
}

export async function moveDealToStageAction(
  dealId: string,
  stageId: string,
): Promise<{ error?: string }> {
  try {
    const session = await requireSession();
    await moveDealToStage(dealId, stageId, session.user.id);
    revalidateDealPaths(dealId);
    return {};
  } catch (error) {
    return toActionError(error);
  }
}

export async function toggleDealHotAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  try {
    await requireSession();
    const id = String(formData.get("id") ?? "");
    const isHot = formData.get("isHot") === "true";
    await setDealHot(id, isHot);
    revalidateDealPaths(id);
    revalidatePath("/kansen");
    return {};
  } catch (error) {
    return toActionError(error);
  }
}

export async function createDealActivityAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  try {
    const session = await requireSession();
    const dealId = String(formData.get("dealId") ?? "");
    const input = parseDealActivityForm(formData);
    await addDealActivity(dealId, input, session.user.id);
    revalidateDealPaths(dealId);
    return {};
  } catch (error) {
    return toActionError(error);
  }
}
