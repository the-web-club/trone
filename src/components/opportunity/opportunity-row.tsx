"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createTimelineEventAction } from "@/app/(beveiligd)/actions/timeline-actions";
import { DealHotIcon } from "@/components/deal/deal-hot-icon";
import { Button } from "@/components/ui/button";
import type { OpportunityItem } from "@/lib/opportunity-service";

export function OpportunityRow({ item }: { item: OpportunityItem }) {
  const [callState, callAction, callPending] = useActionState(
    createTimelineEventAction,
    null,
  );
  const canAct = Boolean(item.dealId || item.contactId || item.companyId);

  return (
    <div className="px-3 py-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-1">
            <Link
              href={item.href}
              className="min-w-0 text-sm font-medium text-fg hover:underline"
            >
              {item.title}
            </Link>
            {item.hot ? <DealHotIcon /> : null}
          </div>
          <p className="text-xs text-fg-muted">{item.reason}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canAct ? (
            <form action={callAction}>
              {item.dealId ? (
                <input type="hidden" name="dealId" value={item.dealId} />
              ) : null}
              {item.contactId ? (
                <input type="hidden" name="contactId" value={item.contactId} />
              ) : null}
              {item.companyId ? (
                <input type="hidden" name="companyId" value={item.companyId} />
              ) : null}
              <input type="hidden" name="type" value="CALL" />
              <input
                type="hidden"
                name="body"
                value="Gebeld vanaf het kansen-overzicht"
              />
              <Button type="submit" variant="secondary" size="sm" loading={callPending}>
                Bellen loggen
              </Button>
            </form>
          ) : null}
        </div>
      </div>
      {callState?.error ? (
        <p className="mt-2 text-xs text-danger" role="alert">
          {callState.error}
        </p>
      ) : null}
    </div>
  );
}
