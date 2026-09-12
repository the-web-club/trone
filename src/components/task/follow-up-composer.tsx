"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createFollowUpTaskAction } from "@/app/(beveiligd)/actions/task-actions";
import { FollowUpFields } from "@/components/task/follow-up-fields";
import { Button } from "@/components/ui/button";
import { FormFooter } from "@/components/ui/form-footer";

export function FollowUpComposer({
  dealId,
  contactId,
  companyId,
  plain = false,
  onSuccess,
}: {
  dealId?: string | null;
  contactId?: string | null;
  companyId?: string | null;
  plain?: boolean;
  onSuccess?: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    createFollowUpTaskAction,
    null,
  );
  const notifiedAt = useRef<number | null>(null);
  const [dateOnly, setDateOnly] = useState(false);

  useEffect(() => {
    if (!state?.createdAt || notifiedAt.current === state.createdAt) return;
    notifiedAt.current = state.createdAt;
    setDateOnly(false);
    onSuccess?.();
  }, [state?.createdAt, onSuccess]);

  return (
    <form
      key={state?.createdAt ?? "new"}
      action={formAction}
      className={
        plain
          ? "flex flex-col gap-3"
          : "flex flex-col gap-3 rounded-md border border-border bg-surface p-3"
      }
    >
      {dealId ? <input type="hidden" name="dealId" value={dealId} /> : null}
      {contactId ? (
        <input type="hidden" name="contactId" value={contactId} />
      ) : null}
      {companyId ? (
        <input type="hidden" name="companyId" value={companyId} />
      ) : null}

      <FollowUpFields
        idPrefix="standalone-"
        dateRequired
        dateOnly={dateOnly}
        onDateOnlyChange={setDateOnly}
      />

      {state?.error ? (
        <p className="text-sm text-danger" role="alert">
          {state.error}
        </p>
      ) : null}
      <FormFooter>
        <Button type="submit" loading={pending}>
          Plannen
        </Button>
      </FormFooter>
    </form>
  );
}
