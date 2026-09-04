"use client";

import { useState } from "react";
import { deleteWorkLogAction } from "@/app/(beveiligd)/actions/worklog-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime, formatDurationMinutes } from "@/lib/format";
import {
  workLogCategoryLabels,
  type WorkLogCategory,
} from "@/lib/worklog-validation";

export type WorkLogListItem = {
  id: string;
  description: string;
  occurredAt: Date;
  category: WorkLogCategory;
  durationMinutes: number | null;
  userId: string;
  userName: string;
  companyId: string | null;
  companyName: string | null;
  orderId: string | null;
  orderNumber: string | null;
};

const categoryTone: Record<WorkLogCategory, "default" | "info" | "success" | "warning"> = {
  MONTAGE: "info",
  BELRONDE: "warning",
  BEZOEK: "success",
  ADMINISTRATIE: "default",
  OVERIG: "default",
};

export function WorkLogList({
  logs,
  currentUserId,
  isAdmin,
}: {
  logs: WorkLogListItem[];
  currentUserId: string;
  isAdmin: boolean;
}) {
  if (logs.length === 0) {
    return (
      <p className="rounded-md border border-border bg-surface px-3 py-6 text-center text-sm text-fg-muted">
        Nog geen werkzaamheden gelogd.
      </p>
    );
  }

  return (
    <ul className="flex flex-col overflow-hidden rounded-md border border-border bg-surface">
      {logs.map((log) => (
        <WorkLogRow
          key={log.id}
          log={log}
          canDelete={isAdmin || log.userId === currentUserId}
        />
      ))}
    </ul>
  );
}

function WorkLogRow({
  log,
  canDelete,
}: {
  log: WorkLogListItem;
  canDelete: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onDelete(formData: FormData) {
    setPending(true);
    setError(null);
    const result = await deleteWorkLogAction(null, formData);
    setPending(false);
    if (result.error) setError(result.error);
  }

  return (
    <li className="flex flex-col gap-1 border-b border-border px-3 py-2.5 last:border-b-0">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm text-fg">{log.description}</p>
          <p className="mt-0.5 text-xs text-fg-muted">
            {log.userName}
            {" · "}
            {formatDateTime(log.occurredAt)}
            {log.durationMinutes ? ` · ${formatDurationMinutes(log.durationMinutes)}` : ""}
            {log.companyName ? ` · ${log.companyName}` : ""}
            {log.orderNumber ? ` · ${log.orderNumber}` : ""}
          </p>
          {error ? (
            <p className="mt-1 text-xs text-danger" role="alert">
              {error}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={categoryTone[log.category]}>
            {workLogCategoryLabels[log.category]}
          </Badge>
          {canDelete ? (
            <form action={onDelete}>
              <input type="hidden" name="id" value={log.id} />
              {log.companyId ? (
                <input type="hidden" name="companyId" value={log.companyId} />
              ) : null}
              {log.orderId ? (
                <input type="hidden" name="orderId" value={log.orderId} />
              ) : null}
              <Button
                type="submit"
                variant="ghost"
                size="xs"
                loading={pending}
              >
                Verwijderen
              </Button>
            </form>
          ) : null}
        </div>
      </div>
    </li>
  );
}
