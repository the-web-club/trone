"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { moveDealToStageAction } from "@/app/(beveiligd)/actions/deal-actions";
import { SelectMenu, type SelectOption } from "@/components/ui/select";
import { cn } from "@/lib/cn";

export type LeadStageOption = {
  id: string;
  name: string;
  isWon: boolean;
  isLost: boolean;
};

function stageToneClass(stage: LeadStageOption | undefined) {
  if (stage?.isWon) {
    return "bg-success-bg text-success hover:bg-success-bg hover:text-success";
  }
  if (stage?.isLost) {
    return "bg-danger-bg text-danger hover:bg-danger-bg hover:text-danger";
  }
  return "bg-info-bg text-info hover:bg-info-bg hover:text-info";
}

export function LeadStageSelect({
  dealId,
  stageId,
  stageName,
  stages,
}: {
  dealId: string;
  stageId: string;
  stageName: string;
  stages: LeadStageOption[];
}) {
  const router = useRouter();
  const [value, setValue] = useState(stageId);
  const [fromServer, setFromServer] = useState(stageId);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (stageId !== fromServer) {
    setFromServer(stageId);
    setValue(stageId);
  }

  const items = useMemo(() => {
    const options: SelectOption[] = stages.map((stage) => ({
      value: stage.id,
      label: stage.name,
    }));
    if (stageId && !options.some((option) => option.value === stageId)) {
      options.unshift({ value: stageId, label: stageName || stageId });
    }
    return options;
  }, [stageId, stageName, stages]);

  const selected =
    stages.find((stage) => stage.id === value) ??
    (value === stageId
      ? { id: stageId, name: stageName, isWon: false, isLost: false }
      : undefined);

  async function onValueChange(next: string) {
    if (next === value) return;
    const previous = value;
    setValue(next);
    setPending(true);
    setError(null);

    const result = await moveDealToStageAction(dealId, next);
    setPending(false);
    if (result.error) {
      setValue(previous);
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="min-w-0">
      <SelectMenu
        aria-label="Fase wijzigen"
        value={value}
        onValueChange={onValueChange}
        items={items}
        size="sm"
        disabled={pending}
        searchPlaceholder="Zoek een fase…"
        className={cn(
          "h-5 w-auto max-w-[12rem] cursor-pointer border-transparent px-1.5 text-xs font-medium",
          stageToneClass(selected),
          "data-[popup-open]:border-border-strong data-[popup-open]:bg-surface data-[popup-open]:text-fg",
          "[&_svg]:opacity-50 group-hover/row:[&_svg]:opacity-100 data-[popup-open]:[&_svg]:opacity-100 focus-visible:[&_svg]:opacity-100",
        )}
      />
      {error ? (
        <p className="mt-0.5 text-xs text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
