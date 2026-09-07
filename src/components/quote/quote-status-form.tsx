"use client";

import { useActionState } from "react";
import { updateQuoteStatusAction } from "@/app/(beveiligd)/actions/quote-actions";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { SelectMenu } from "@/components/ui/select";
import { quoteStatusLabels, quoteStatuses } from "@/lib/quote-validation";

export function QuoteStatusForm({
  quoteId,
  status,
}: {
  quoteId: string;
  status: (typeof quoteStatuses)[number];
}) {
  const [state, formAction, pending] = useActionState(
    updateQuoteStatusAction,
    null,
  );

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="id" value={quoteId} />
      <FormField id="status" label="Status">
        <SelectMenu
          name="status"
          defaultValue={status}
          className="min-w-44"
          searchPlaceholder="Zoek een status…"
          items={quoteStatuses.map((value) => ({
            value,
            label: quoteStatusLabels[value],
          }))}
        />
      </FormField>
      <Button type="submit" variant="secondary" loading={pending}>
        Status opslaan
      </Button>
      {state?.error ? (
        <p className="text-sm text-danger" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
