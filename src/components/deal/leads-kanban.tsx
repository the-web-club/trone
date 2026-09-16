"use client";

import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  listKanbanColumnPageAction,
  moveDealToStageAction,
} from "@/app/(beveiligd)/actions/deal-actions";
import { Lift, Stagger, StaggerItem } from "@/components/motion";
import { controlMotion } from "@/components/motion/styles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SelectMenu } from "@/components/ui/select";
import { DealHotIcon } from "@/components/deal/deal-hot-icon";
import { LeadScoreView } from "@/components/deal/lead-score-view";
import { CompanyLink } from "@/components/entity-links";
import { UserAvatar } from "@/components/user/user-avatar";
import { formatEuro } from "@/lib/format";
import {
  KANBAN_COLUMN_PAGE_SIZE,
  type KanbanDeal,
} from "@/lib/kanban-deal";
import type { DealsFilterValues } from "@/lib/deals-query";
import { dealPath } from "@/lib/paths";
import { leadScoreFromDeal } from "@/lib/lead-score";
import { cn } from "@/lib/cn";
import {
  quoteStatusLabels,
  quoteStatusTones,
} from "@/lib/quote-validation";

export type KanbanStage = {
  id: string;
  name: string;
  isWon: boolean;
  isLost: boolean;
};

export type { KanbanDeal };

function stageTone(stage: KanbanStage): "default" | "success" | "danger" {
  if (stage.isWon) return "success";
  if (stage.isLost) return "danger";
  return "default";
}

function DealCard({
  deal,
  stages,
  onMove,
}: {
  deal: KanbanDeal;
  stages: KanbanStage[];
  onMove: (dealId: string, stageId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: deal.id });
  const value = formatEuro(deal.valueEstimate);

  return (
    <Lift disabled={isDragging}>
    <Card
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cn(
        "cursor-grab touch-none px-3 py-2.5",
        controlMotion,
        isDragging && "opacity-60 shadow-[var(--shadow-pop)]",
      )}
      {...listeners}
      {...attributes}
    >
      <div className="flex min-w-0 items-start gap-1">
        <Link
          href={dealPath(deal)}
          className="min-w-0 flex-1 text-md font-medium break-words text-fg hover:underline"
          onClick={(event) => event.stopPropagation()}
        >
          {deal.title}
        </Link>
        {deal.isHot ? <DealHotIcon className="mt-0.5" /> : null}
      </div>
      {deal.company ? (
        <p
          className="mt-0.5 min-w-0 text-sm break-words text-fg-muted"
          onClick={(event) => event.stopPropagation()}
        >
          <CompanyLink company={deal.company} />
        </p>
      ) : null}
      <div
        className="mt-1.5 min-w-0"
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <LeadScoreView result={leadScoreFromDeal(deal)} compact />
      </div>
      {value || deal.quoteStatus ? (
        <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          {value ? (
            <p className="text-sm tabular-nums text-fg">{value}</p>
          ) : null}
          {deal.quoteStatus ? (
            <Badge
              tone={quoteStatusTones[deal.quoteStatus]}
              className="h-auto min-h-5 max-w-full whitespace-normal"
            >
              {quoteStatusLabels[deal.quoteStatus]}
            </Badge>
          ) : null}
        </div>
      ) : null}
      {deal.ownerName ? (
        <div className="mt-2 flex min-w-0 items-center gap-1.5">
          <UserAvatar
            name={deal.ownerName}
            image={deal.ownerImage}
            size="xs"
          />
          <span className="min-w-0 truncate text-sm text-fg-muted">
            {deal.ownerName}
          </span>
        </div>
      ) : null}
      <div
        className="mt-2"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <SelectMenu
          aria-label="Fase wijzigen"
          value={deal.stageId}
          onValueChange={(next) => onMove(deal.id, next)}
          items={stages.map((stage) => ({
            value: stage.id,
            label: stage.name,
          }))}
          size="sm"
          searchPlaceholder="Zoek een fase…"
          className="text-xs"
        />
      </div>
    </Card>
    </Lift>
  );
}

function StageColumn({
  stage,
  deals,
  total,
  stages,
  loading,
  onMove,
  onLoadMore,
}: {
  stage: KanbanStage;
  deals: KanbanDeal[];
  total: number;
  stages: KanbanStage[];
  loading: boolean;
  onMove: (dealId: string, stageId: string) => void;
  onLoadMore: () => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: `stage:${stage.id}` });
  const remaining = Math.max(total - deals.length, 0);

  return (
    <section
      ref={setNodeRef}
      className={cn(
        "flex min-h-72 w-64 shrink-0 flex-col rounded-md border border-border bg-surface-sunk/60 p-2",
        controlMotion,
        isOver && "border-border-strong bg-hover",
      )}
    >
      <header className="mb-2 flex items-center justify-between gap-2 px-1">
        <h2 className="truncate text-sm font-medium text-fg">{stage.name}</h2>
        <Badge tone={stageTone(stage)}>{total}</Badge>
      </header>
      <Stagger className="flex flex-1 flex-col gap-2">
        {deals.map((deal) => (
          <StaggerItem key={deal.id}>
            <DealCard deal={deal} stages={stages} onMove={onMove} />
          </StaggerItem>
        ))}
      </Stagger>
      {remaining > 0 ? (
        <div className="mt-2">
          <Button
            variant="secondary"
            size="sm"
            className="w-full"
            loading={loading}
            onClick={onLoadMore}
          >
            Laad meer
            <span className="text-fg-muted">nog {remaining}</span>
          </Button>
        </div>
      ) : null}
    </section>
  );
}

export function LeadsKanban({
  stages,
  deals,
  stageTotals,
  filters,
}: {
  stages: KanbanStage[];
  deals: KanbanDeal[];
  stageTotals: Record<string, number>;
  filters: DealsFilterValues;
}) {
  const router = useRouter();
  const [items, setItems] = useState(deals);
  const [fromServer, setFromServer] = useState(deals);
  const [totals, setTotals] = useState(stageTotals);
  const [loadingStageId, setLoadingStageId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (deals !== fromServer) {
    setFromServer(deals);
    setItems(deals);
    setTotals(stageTotals);
    setLoadingStageId(null);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const byStage = useMemo(() => {
    const map = new Map<string, KanbanDeal[]>();
    for (const stage of stages) map.set(stage.id, []);
    for (const deal of items) {
      map.get(deal.stageId)?.push(deal);
    }
    return map;
  }, [items, stages]);

  async function moveDeal(dealId: string, stageId: string) {
    const current = items.find((deal) => deal.id === dealId);
    if (!current || current.stageId === stageId) return;

    setError(null);
    setItems((list) =>
      list.map((deal) => (deal.id === dealId ? { ...deal, stageId } : deal)),
    );
    setTotals((currentTotals) => ({
      ...currentTotals,
      [current.stageId]: Math.max((currentTotals[current.stageId] ?? 1) - 1, 0),
      [stageId]: (currentTotals[stageId] ?? 0) + 1,
    }));

    const result = await moveDealToStageAction(dealId, stageId);
    if (result.error) {
      setItems((list) =>
        list.map((deal) =>
          deal.id === dealId ? { ...deal, stageId: current.stageId } : deal,
        ),
      );
      setTotals((currentTotals) => ({
        ...currentTotals,
        [current.stageId]: (currentTotals[current.stageId] ?? 0) + 1,
        [stageId]: Math.max((currentTotals[stageId] ?? 1) - 1, 0),
      }));
      setError(result.error);
      return;
    }
    router.refresh();
  }

  async function loadMore(stageId: string) {
    if (loadingStageId) return;

    setError(null);
    setLoadingStageId(stageId);
    try {
      const result = await listKanbanColumnPageAction(
        filters,
        stageId,
        items.map((deal) => deal.id),
      );

      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }
      if (!("items" in result)) return;

      const loadedBefore = items.filter((deal) => deal.stageId === stageId).length;
      const existingIds = new Set(items.map((deal) => deal.id));
      const appended = result.items.filter((deal) => !existingIds.has(deal.id));

      setItems((list) => {
        const seen = new Set(list.map((deal) => deal.id));
        return [...list, ...result.items.filter((deal) => !seen.has(deal.id))];
      });

      if (result.items.length < KANBAN_COLUMN_PAGE_SIZE) {
        const loadedAfter =
          loadedBefore +
          appended.filter((deal) => deal.stageId === stageId).length;
        setTotals((currentTotals) => ({
          ...currentTotals,
          [stageId]: loadedAfter,
        }));
      }
    } finally {
      setLoadingStageId(null);
    }
  }

  function onDragEnd(event: DragEndEvent) {
    const overId = event.over?.id;
    if (typeof overId !== "string" || !overId.startsWith("stage:")) return;
    void moveDeal(String(event.active.id), overId.slice("stage:".length));
  }

  return (
    <div className="flex flex-col gap-3">
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {stages.map((stage) => (
            <StageColumn
              key={stage.id}
              stage={stage}
              stages={stages}
              deals={byStage.get(stage.id) ?? []}
              total={totals[stage.id] ?? 0}
              loading={loadingStageId === stage.id}
              onMove={moveDeal}
              onLoadMore={() => void loadMore(stage.id)}
            />
          ))}
        </div>
      </DndContext>
    </div>
  );
}
