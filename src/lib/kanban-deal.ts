import { effectiveDealValue } from "@/lib/deal-value";
import type { LeadScoreAnswerFields } from "@/lib/lead-score";
import type { QuoteStatusInput } from "@/lib/quote-validation";

export const KANBAN_COLUMN_PAGE_SIZE = 30;

export type KanbanDeal = {
  id: string;
  slug: string;
  title: string;
  stageId: string;
  company: { slug: string; name: string } | null;
  quoteStatus: QuoteStatusInput | null;
  valueEstimate: number | null;
  isHot: boolean;
  ownerName: string | null;
  ownerImage: string | null;
} & LeadScoreAnswerFields;

export type KanbanDealSource = {
  id: string;
  slug: string;
  title: string;
  stageId: string;
  company: { slug: string; name: string } | null;
  quotes: Array<{
    status: string;
    total: { toString(): string } | number | string;
  }>;
  valueEstimate: { toString(): string } | number | string | null;
  isHot: boolean;
  ownerUserId: string | null;
  qualFit: string | null;
  qualNeed: string | null;
  qualIntent: string | null;
  qualDecision: string | null;
  qualTiming: string | null;
};

export function toKanbanDeal(
  deal: KanbanDealSource,
  ownerNames: Map<string, string>,
  ownerImages: Map<string, string | null>,
): KanbanDeal {
  return {
    id: deal.id,
    slug: deal.slug,
    title: deal.title,
    stageId: deal.stageId,
    company: deal.company
      ? { slug: deal.company.slug, name: deal.company.name }
      : null,
    quoteStatus: (deal.quotes[0]?.status as QuoteStatusInput | undefined) ?? null,
    valueEstimate: effectiveDealValue(
      deal.valueEstimate == null ? null : Number(deal.valueEstimate),
      deal.quotes,
    ),
    isHot: deal.isHot,
    ownerName: deal.ownerUserId
      ? (ownerNames.get(deal.ownerUserId) ?? null)
      : null,
    ownerImage: deal.ownerUserId
      ? (ownerImages.get(deal.ownerUserId) ?? null)
      : null,
    qualFit: deal.qualFit,
    qualNeed: deal.qualNeed,
    qualIntent: deal.qualIntent,
    qualDecision: deal.qualDecision,
    qualTiming: deal.qualTiming,
  };
}
