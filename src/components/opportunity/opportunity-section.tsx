"use client";

import { useState } from "react";
import { OpportunityRow } from "@/components/opportunity/opportunity-row";
import { Stagger, StaggerItem } from "@/components/motion";
import { Button } from "@/components/ui/button";
import type { OpportunityItem } from "@/lib/opportunity-service";

const IDLE_PAGE_SIZE = 15;

export function OpportunitySection({
  title,
  items,
  pageSize,
  emptyMessage = "Niets in deze lijst.",
  hideWhenEmpty = false,
}: {
  title: string;
  items: OpportunityItem[];
  pageSize?: number;
  emptyMessage?: string;
  hideWhenEmpty?: boolean;
}) {
  const [visible, setVisible] = useState(pageSize ?? items.length);

  if (hideWhenEmpty && items.length === 0) return null;

  const shown = pageSize ? items.slice(0, visible) : items;
  const remaining = pageSize ? Math.max(items.length - shown.length, 0) : 0;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-md font-medium text-fg">
        {title}
        <span className="ml-2 text-sm font-normal text-fg-muted">
          {items.length}
        </span>
      </h2>
      {items.length === 0 ? (
        <p className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg-muted">
          {emptyMessage}
        </p>
      ) : (
        <>
          <Stagger as="ul" className="flex flex-col gap-2">
            {shown.map((item) => (
              <StaggerItem key={item.id} as="li">
                <OpportunityRow item={item} />
              </StaggerItem>
            ))}
          </Stagger>
          {remaining > 0 ? (
            <div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setVisible((count) => count + (pageSize ?? IDLE_PAGE_SIZE))}
              >
                Laad meer
                <span className="text-fg-muted">nog {remaining}</span>
              </Button>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

export { IDLE_PAGE_SIZE };
