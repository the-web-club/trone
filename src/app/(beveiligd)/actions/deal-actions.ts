"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  requireAdmin,
  requireSession,
  requireWritableSession,
} from "@/lib/auth-session";
import {
  addDealActivity,
  createDeal,
  dealListFiltersFromValues,
  deleteDeal,
  getDeal,
  listDealsForSelect,
  listDealStages,
  listDealTeamMembers,
  listKanbanColumnPage,
  moveDealToStage,
  setDealHot,
  setDealOwner,
  setDealQualificationAnswer,
  updateDeal,
} from "@/lib/deal-service";
import { toKanbanDeal, type KanbanDeal } from "@/lib/kanban-deal";
import type { DealsFilterValues } from "@/lib/deals-query";
import {
  dealRecordToInput,
  mergeDealPatch,
  parseDealActivityForm,
  parseDealForm,
  type DealPatch,
} from "@/lib/deal-validation";
import { toActionError } from "@/lib/errors";
import { parseDealSubmissionId } from "@/lib/lead-submission";
import { dealPath } from "@/lib/paths";
import type { LeadScoreAnswers, LeadScoreResult } from "@/lib/lead-score";

function isNextRedirect(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    String((error as { digest: string }).digest).startsWith("NEXT_REDIRECT")
  );
}

function revalidateDealPaths(deal?: { slug: string }) {
  revalidatePath("/leads", "layout");
  revalidatePath("/overzicht");
  revalidatePath("/kansen");
  if (deal) revalidatePath(dealPath(deal));
}

export async function createDealAction(
  _prev: {
    error?: string;
    fieldErrors?: Record<string, string>;
    deal?: { id: string; slug: string };
  } | null,
  formData: FormData,
): Promise<{
  error?: string;
  fieldErrors?: Record<string, string>;
  deal?: { id: string; slug: string };
}> {
  try {
    const session = await requireSession();
    const submissionId = parseDealSubmissionId(formData.get("submissionId"));
    const input = parseDealForm(formData);
    const deal = await createDeal(input, session.user.id, { submissionId });
    revalidateDealPaths(deal);
    return { deal: { id: deal.id, slug: deal.slug } };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateDealAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  try {
    const session = formData.has("applications")
      ? await requireWritableSession()
      : await requireSession();
    const id = String(formData.get("id") ?? "");
    const input = parseDealForm(formData);
    const deal = await updateDeal(id, input, session.user.id);
    revalidateDealPaths(deal);
    return {};
  } catch (error) {
    return toActionError(error);
  }
}

export async function patchDealAction(
  dealId: string,
  patch: DealPatch,
): Promise<{ error?: string; slug?: string }> {
  try {
    const session =
      patch.applications !== undefined
        ? await requireWritableSession()
        : await requireSession();
    const current = await getDeal(dealId);
    const input = mergeDealPatch(dealRecordToInput(current), patch);
    const deal = await updateDeal(current.id, input, session.user.id);
    revalidateDealPaths(deal);
    return { slug: deal.slug };
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
    const deal = await moveDealToStage(dealId, stageId, session.user.id);
    revalidateDealPaths(deal);
    return {};
  } catch (error) {
    return toActionError(error);
  }
}

export async function setDealOwnerAction(
  dealId: string,
  ownerUserId: string | null,
): Promise<{ error?: string }> {
  try {
    await requireSession();
    const deal = await setDealOwner(dealId, ownerUserId);
    revalidateDealPaths(deal);
    return {};
  } catch (error) {
    return toActionError(error);
  }
}

export async function patchDealQualificationAction(
  dealId: string,
  questionId: string,
  answerKey: string | null,
): Promise<{
  error?: string;
  answers?: LeadScoreAnswers;
  result?: LeadScoreResult;
}> {
  try {
    await requireWritableSession();
    const updated = await setDealQualificationAnswer(
      dealId,
      questionId,
      answerKey,
    );
    revalidateDealPaths(updated);
    return { answers: updated.answers, result: updated.result };
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
    const deal = await setDealHot(id, isHot);
    revalidateDealPaths(deal);
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
    revalidateDealPaths();
    return {};
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteDealAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  try {
    await requireAdmin();
    const id = String(formData.get("id") ?? "");
    await deleteDeal(id);
    revalidateDealPaths();
    redirect("/leads");
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    return toActionError(error);
  }
}

export async function listDealsForSelectAction(companyId?: string | null) {
  await requireSession();
  return listDealsForSelect(companyId);
}

export async function listKanbanColumnPageAction(
  filters: DealsFilterValues,
  stageId: string,
  excludeIds: string[],
): Promise<{ items: KanbanDeal[] } | { error: string }> {
  try {
    const session = await requireSession();
    const { items } = await listKanbanColumnPage(
      { ...dealListFiltersFromValues(filters), stageId },
      session.user.id,
      excludeIds,
    );
    const members = await listDealTeamMembers();
    const ownerNames = new Map(
      members.map((member) => [member.id, member.name || member.email]),
    );
    const ownerImages = new Map(
      members.map((member) => [member.id, member.image]),
    );
    return {
      items: items.map((deal) => toKanbanDeal(deal, ownerNames, ownerImages)),
    };
  } catch (error) {
    return toActionError(error);
  }
}

export type CreatedDealOption = {
  id: string;
  title: string;
  companyId: string | null;
};

/** Compact aanmaken zonder redirect, voor de lead-select op de offerte. */
export async function createDealInlineAction(
  formData: FormData,
): Promise<{
  error?: string;
  fieldErrors?: Record<string, string>;
  deal?: CreatedDealOption;
}> {
  try {
    const session = await requireSession();
    const submissionId = parseDealSubmissionId(formData.get("submissionId"));
    const title = String(formData.get("title") ?? "").trim();
    const companyId = String(formData.get("companyId") ?? "").trim() || undefined;
    const contactId = String(formData.get("contactId") ?? "").trim() || undefined;
    if (!title) {
      return {
        error: "Titel is verplicht",
        fieldErrors: { title: "Titel is verplicht" },
      };
    }
    const stages = await listDealStages();
    const stage =
      stages.find((row) => !row.isWon && !row.isLost) ?? stages[0];
    if (!stage) {
      return { error: "Geen fase beschikbaar." };
    }
    const deal = await createDeal(
      {
        title,
        companyId,
        contactId,
        stageId: stage.id,
      },
      session.user.id,
      { submissionId },
    );
    revalidatePath("/leads");
    revalidatePath("/overzicht");
    revalidatePath("/kansen");
    revalidatePath(dealPath(deal));
    return {
      deal: {
        id: deal.id,
        title: deal.title,
        companyId: deal.companyId,
      },
    };
  } catch (error) {
    return toActionError(error);
  }
}
