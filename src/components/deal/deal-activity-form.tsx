"use client";

import { useActionState } from "react";
import { createDealActivityAction } from "@/app/(beveiligd)/actions/deal-actions";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { activityTypeLabels } from "@/lib/deal-validation";

export function DealActivityForm({ dealId }: { dealId: string }) {
  const [state, formAction, pending] = useActionState(
    createDealActivityAction,
    null,
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="dealId" value={dealId} />
      <FormField id="type" label="Type">
        <Select name="type" defaultValue="NOTE">
          <option value="NOTE">{activityTypeLabels.NOTE}</option>
          <option value="CALL">{activityTypeLabels.CALL}</option>
          <option value="EMAIL">{activityTypeLabels.EMAIL}</option>
          <option value="MEETING">{activityTypeLabels.MEETING}</option>
          <option value="DEMO">{activityTypeLabels.DEMO}</option>
        </Select>
      </FormField>
      <FormField id="body" label="Toelichting">
        <Textarea name="body" placeholder="Wat is er gebeurd?" />
      </FormField>
      {state?.error ? (
        <p className="text-sm text-danger" role="alert">
          {state.error}
        </p>
      ) : null}
      <div>
        <Button type="submit" loading={pending}>
          Activiteit toevoegen
        </Button>
      </div>
    </form>
  );
}
