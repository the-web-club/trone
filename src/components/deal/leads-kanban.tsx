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
import { moveDealToStageAction } from "@/app/(beveiligd)/actions/deal-actions";
import { Lift, Stagger, StaggerItem } from "@/components/motion";
import { controlMotion } from "@/components/motion/styles";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SelectMenu } from "@/components/ui/select";
import { DealHotIcon } from "@/components/deal/deal-hot-icon";
import { CompanyLink } from "@/components/entity-links";
import { UserAvatar } from "@/components/user/user-avatar";
import { formatEuro } from "@/lib/format";
import { dealPath } from "@/lib/paths";
import { cn } from "@/lib/cn";
import {
  quoteStatusLabels,
  quoteStatusTones,
  type QuoteStatusInput,
} from "@/lib/quote-validation";

export type KanbanStage = {
  id: string;
  name: string;
  isWon: boolean;
  isLost: boolean;
};

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
};

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
        "cursor-grab touch-none p-2.5",
        controlMotion,
        isDragging && "opacity-60 shadow-[var(--shadow-pop)]",
      )}
      {...listeners}
      {...attributes}
    >
      <div className="flex items-start gap-1">
        <Link
          href={dealPath(deal)}
          className="min-w-0 flex-1 text-sm font-medium text-fg hover:underline"
          onClick={(event) => event.stopPropagation()}
        >
          {deal.title}
        </Link>
        {deal.isHot ? <DealHotIcon className="mt-0.5" /> : null}
      </div>
      <p
        className="mt-0.5 truncate text-xs text-fg-muted"
        onClick={(event) => event.stopPropagation()}
      >
        <CompanyLink company={deal.company} fallback="Geen bedrijf" />
      </p>
      {value ? <p className="mt-1 text-xs text-fg">{value}</p> : null}
      {deal.quoteStatus ? (
        <div className="mt-1.5">
          <Badge tone={quoteStatusTones[deal.quoteStatus]}>
            {quoteStatusLabels[deal.quoteStatus]}
          </Badge>
        </div>
      ) : null}
      {deal.ownerName ? (
        <div className="mt-2 flex items-center gap-1.5">
          <UserAvatar
            name={deal.ownerName}
            image={deal.ownerImage}
            size="xs"
          />
          <span className="truncate text-xs text-fg-muted">{deal.ownerName}</span>
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
  stages,
  onMove,
}: {
  stage: KanbanStage;
  deals: KanbanDeal[];
  stages: KanbanStage[];
  onMove: (dealId: string, stageId: string) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: `stage:${stage.id}` });

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
        <Badge tone={stageTone(stage)}>{deals.length}</Badge>
      </header>
      <Stagger className="flex flex-1 flex-col gap-2">
        {deals.map((deal) => (
          <StaggerItem key={deal.id}>
            <DealCard deal={deal} stages={stages} onMove={onMove} />
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}

export function LeadsKanban({
  stages,
  deals,
}: {
  stages: KanbanStage[];
  deals: KanbanDeal[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(deals);
  const [fromServer, setFromServer] = useState(deals);
  const [error, setError] = useState<string | null>(null);

  if (deals !== fromServer) {
    setFromServer(deals);
    setItems(deals);
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

    const result = await moveDealToStageAction(dealId, stageId);
    if (result.error) {
      setItems((list) =>
        list.map((deal) =>
          deal.id === dealId ? { ...deal, stageId: current.stageId } : deal,
        ),
      );
      setError(result.error);
      return;
    }
    router.refresh();
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
              onMove={moveDeal}
            />
          ))}
        </div>
      </DndContext>
    </div>
  );
}
