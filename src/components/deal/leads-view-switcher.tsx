"use client";

import { Columns3, List } from "lucide-react";
import { useRouter } from "next/navigation";
import type { TransitionStartFunction } from "react";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  buildDealsHref,
  type DealsQueryValues,
  type DealsView,
} from "@/lib/deals-query";

export function LeadsViewSwitcher({
  view,
  values,
  startTransition,
  disabled = false,
  className,
}: {
  view: DealsView;
  values: DealsQueryValues;
  startTransition: TransitionStartFunction;
  disabled?: boolean;
  className?: string;
}) {
  const router = useRouter();

  function selectView(next: DealsView) {
    const href = buildDealsHref({
      ...values,
      fase: next === "kanban" ? "" : values.fase,
      view: next,
      pagina: 1,
    });

    startTransition(() => {
      router.replace(href, { scroll: false });
    });
  }

  return (
    <SegmentedControl<DealsView>
      aria-label="Weergave kiezen"
      className={className}
      value={view}
      onValueChange={selectView}
      disabled={disabled}
      items={[
        { value: "lijst", label: "Lijst", icon: List, compactLabel: true },
        { value: "kanban", label: "Kanban", icon: Columns3, compactLabel: true },
      ]}
    />
  );
}
