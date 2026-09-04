"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { createTimelineEventAction } from "@/app/(beveiligd)/actions/timeline-actions";
import { TaskForm } from "@/components/task/task-form";
import { Button } from "@/components/ui/button";
import type { OpportunityItem } from "@/lib/opportunity-service";

export function OpportunityRow({
  item,
  currentUserId,
  assignees,
}: {
  item: OpportunityItem;
  currentUserId: string;
  assignees: Array<{ id: string; name: string }>;
}) {
  const [showTask, setShowTask] = useState(false);
  const [callState, callAction, callPending] = useActionState(
    createTimelineEventAction,
    null,
  );
  const canAct = Boolean(item.dealId || item.contactId || item.companyId);

  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={item.href} className="text-sm font-medium text-fg hover:underline">
            {item.title}
          </Link>
          <p className="text-xs text-fg-muted">{item.reason}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={item.href}>
            <Button variant="secondary" size="sm">
              Openen
            </Button>
          </Link>
          {canAct ? (
            <>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setShowTask((open) => !open)}
              >
                Taak maken
              </Button>
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
            </>
          ) : null}
        </div>
      </div>
      {callState?.error ? (
        <p className="mt-2 text-xs text-danger" role="alert">
          {callState.error}
        </p>
      ) : null}
      {showTask ? (
        <div className="mt-3 border-t border-border pt-3">
          <TaskForm
            currentUserId={currentUserId}
            assignees={assignees}
            dealId={item.dealId}
            contactId={item.contactId}
            companyId={item.companyId}
          />
        </div>
      ) : null}
    </div>
  );
}
