"use client";

import { useActionState, useEffect, useRef } from "react";
import { createTaskAction } from "@/app/(beveiligd)/actions/task-actions";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { SelectMenu } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { taskPriorityLabels } from "@/lib/task-validation";

export function TaskForm({
  currentUserId,
  assignees,
  dealId,
  contactId,
  companyId,
  onSuccess,
}: {
  currentUserId: string;
  assignees: Array<{ id: string; name: string; image?: string | null }>;
  dealId?: string | null;
  contactId?: string | null;
  companyId?: string | null;
  onSuccess?: () => void;
}) {
  const [state, formAction, pending] = useActionState(createTaskAction, null);
  const notifiedAt = useRef<number | null>(null);

  useEffect(() => {
    if (!state?.createdAt || notifiedAt.current === state.createdAt) return;
    notifiedAt.current = state.createdAt;
    onSuccess?.();
  }, [state?.createdAt, onSuccess]);

  return (
    <form
      key={state?.createdAt ?? "new"}
      action={formAction}
      className="flex flex-col gap-3"
    >
      {dealId ? <input type="hidden" name="dealId" value={dealId} /> : null}
      {contactId ? (
        <input type="hidden" name="contactId" value={contactId} />
      ) : null}
      {companyId ? (
        <input type="hidden" name="companyId" value={companyId} />
      ) : null}
      <FormField id="title" label="Titel">
        <Input name="title" required placeholder="Bijvoorbeeld: terugbellen" />
      </FormField>
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField id="dueAt" label="Vervaldatum">
          <Input name="dueAt" type="date" />
        </FormField>
        <FormField id="assigneeUserId" label="Toegewezen aan">
          <SelectMenu
            name="assigneeUserId"
            defaultValue={currentUserId}
            items={assignees.map((user) => ({
              value: user.id,
              label: user.name,
              image: user.image,
            }))}
            searchPlaceholder="Zoek een medewerker…"
          />
        </FormField>
      </div>
      <FormField id="priority" label="Prioriteit">
        <SelectMenu
          name="priority"
          defaultValue=""
          items={[
            { value: "", label: "Geen" },
            { value: "LOW", label: taskPriorityLabels.LOW },
            { value: "NORMAL", label: taskPriorityLabels.NORMAL },
            { value: "HIGH", label: taskPriorityLabels.HIGH },
          ]}
          searchPlaceholder="Zoek een prioriteit…"
        />
      </FormField>
      <FormField id="description" label="Toelichting">
        <Textarea name="description" placeholder="Optioneel" />
      </FormField>
      {state?.error ? (
        <p className="text-sm text-danger" role="alert">
          {state.error}
        </p>
      ) : null}
      <div>
        <Button type="submit" loading={pending}>
          Taak toevoegen
        </Button>
      </div>
    </form>
  );
}
