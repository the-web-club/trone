"use client";

import { Info } from "lucide-react";
import {
  PopoverContent,
  PopoverDescription,
  PopoverRoot,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import {
  leadScoreCategoryLabel,
  leadScoreCompletenessLabel,
  leadScoreFractionLabel,
  type LeadScoreDisplayCategory,
  type LeadScoreResult,
} from "@/lib/lead-score";

function categoryTone(
  category: LeadScoreDisplayCategory,
): "default" | "info" | "success" | "warning" | "danger" {
  switch (category) {
    case "high":
      return "success";
    case "medium":
      return "warning";
    case "low":
      return "info";
    case "no_match":
      return "danger";
    case "unassessed":
      return "default";
  }
}

function ScoreSummary({
  result,
  compact = false,
}: {
  result: LeadScoreResult;
  compact?: boolean;
}) {
  const fraction = leadScoreFractionLabel(result);
  const incomplete = result.assessedCount > 0 && !result.isComplete;

  if (result.category === "unassessed") {
    return (
      <span className="text-fg-muted">
        {leadScoreCategoryLabel(result.category)}
      </span>
    );
  }

  if (result.category === "no_match") {
    return (
      <span className="inline-flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
        <Badge tone="danger">{leadScoreCategoryLabel(result.category)}</Badge>
        {incomplete ? (
          <span className="text-xs text-fg-subtle">
            {result.assessedCount}/{result.totalQuestions}
          </span>
        ) : null}
      </span>
    );
  }

  return (
    <span className="inline-flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
      {fraction ? (
        <span className="tabular-nums font-medium text-fg">{fraction}</span>
      ) : null}
      <Badge tone={categoryTone(result.category)}>
        {leadScoreCategoryLabel(result.category)}
      </Badge>
      {incomplete ? (
        <span className="text-xs text-fg-subtle">
          {compact
            ? `${result.assessedCount}/${result.totalQuestions}`
            : leadScoreCompletenessLabel(result)}
        </span>
      ) : null}
    </span>
  );
}

function ScoreBreakdown({ result }: { result: LeadScoreResult }) {
  return (
    <div className="space-y-2">
      <ul className="space-y-1.5">
        {result.breakdown.map((item) => (
          <li key={item.questionId} className="min-w-0 text-sm">
            <p className="text-pretty break-words text-fg-muted">
              {item.question}
            </p>
            <p className="flex min-w-0 items-baseline justify-between gap-3">
              <span className="min-w-0 text-pretty break-words text-fg">
                {item.answerLabel}
              </span>
              <span className="shrink-0 tabular-nums text-fg-muted">
                {item.assessed ? `${item.points}` : "—"}
              </span>
            </p>
          </li>
        ))}
      </ul>
      <p className="flex items-baseline justify-between gap-3 border-t border-border pt-2 text-sm">
        <span className="font-medium text-fg">Totaal</span>
        <span className="tabular-nums font-medium text-fg">
          {result.score == null ? "Niet beoordeeld" : `${result.score}/100`}
        </span>
      </p>
      {result.isNoMatch ? (
        <p className="text-xs text-fg-muted">
          Geen passende toepassing zet de status op Geen match, ongeacht de
          overige punten.
        </p>
      ) : null}
    </div>
  );
}

export function LeadScoreView({
  result,
  compact = false,
  showInfo = false,
}: {
  result: LeadScoreResult;
  compact?: boolean;
  showInfo?: boolean;
}) {
  const completeness = leadScoreCompletenessLabel(result);
  const title =
    result.category === "unassessed"
      ? "Niet beoordeeld"
      : [
          leadScoreFractionLabel(result),
          leadScoreCategoryLabel(result.category),
          result.isComplete ? null : completeness,
        ]
          .filter(Boolean)
          .join(" · ");

  return (
    <span
      className="inline-flex min-w-0 max-w-full"
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
    <PopoverRoot>
      <PopoverTrigger
        render={
          <button
            type="button"
            className={cn(
              "inline-flex min-w-0 max-w-full items-center gap-1 rounded-sm text-left text-sm",
              "hover:bg-hover-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg",
              compact ? "px-0.5 py-0.5" : "px-1 py-0.5",
            )}
            aria-label={`Leadscore: ${title}. Toon opbouw.`}
          />
        }
      >
        <ScoreSummary result={result} compact={compact} />
        {showInfo ? (
          <Info className="size-3.5 shrink-0 text-fg-subtle" aria-hidden />
        ) : null}
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[min(22rem,var(--available-width))]"
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <PopoverTitle className="mb-1 text-sm font-medium text-fg">
          Score-opbouw
        </PopoverTitle>
        <PopoverDescription className="sr-only">
          Punten per kwalificatievraag. Dit is een kwalificatiescore, geen
          winstkanspercentage.
        </PopoverDescription>
        <ScoreBreakdown result={result} />
      </PopoverContent>
    </PopoverRoot>
    </span>
  );
}
