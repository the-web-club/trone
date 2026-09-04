"use client";

import { useActionState } from "react";
import { createTaskAction } from "@/app/(beveiligd)/actions/task-actions";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { taskPriorityLabels } from "@/lib/task-validation";

export function TaskForm({
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
  const [state, formAction, pending] = useActionState(createTaskAction, null);

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
          <Select name="assigneeUserId" defaultValue={currentUserId}>
            {assignees.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </Select>
        </FormField>
      </div>
      <FormField id="priority" label="Prioriteit">
        <Select name="priority" defaultValue="">
          <option value="">Geen</option>
          <option value="LOW">{taskPriorityLabels.LOW}</option>
          <option value="NORMAL">{taskPriorityLabels.NORMAL}</option>
          <option value="HIGH">{taskPriorityLabels.HIGH}</option>
        </Select>
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
