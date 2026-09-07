"use client";

import { CollapsibleComposer } from "@/components/detail/collapsible-composer";
import { TaskForm } from "@/components/task/task-form";

export function CollapsibleTaskForm({
  currentUserId,
  assignees,
  dealId,
  contactId,
  companyId,
}: {
  currentUserId: string;
  assignees: Array<{ id: string; name: string }>;
  dealId?: string | null;
  contactId?: string | null;
  companyId?: string | null;
}) {
  return (
    <CollapsibleComposer label="Taak toevoegen">
      {({ close }) => (
        <TaskForm
          currentUserId={currentUserId}
          assignees={assignees}
          dealId={dealId}
          contactId={contactId}
          companyId={companyId}
          onSuccess={close}
        />
      )}
    </CollapsibleComposer>
  );
}
