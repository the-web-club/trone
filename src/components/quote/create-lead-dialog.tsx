"use client";

import { useId, useRef } from "react";
import { createDealInlineAction } from "@/app/(beveiligd)/actions/deal-actions";
import type { CreatedDealOption } from "@/app/(beveiligd)/actions/deal-actions";
import { LeadSubmitButton } from "@/components/deal/lead-submit-button";
import { FormStatus } from "@/components/form/form-status";
import { useFormSubmission } from "@/components/form/use-form-submission";
import {
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import {
  safeParseDealTitleForm,
} from "@/lib/deal-validation";
import { LEAD_SAVE_UNCERTAIN_MESSAGE } from "@/lib/lead-submission";

export function CreateLeadDialog({
  companyId,
  contactId,
  defaultTitle,
  open,
  onOpenChange,
  onCreated,
}: {
  companyId: string;
  contactId?: string;
  defaultTitle?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (deal: CreatedDealOption) => void;
}) {
  const id = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const form = useFormSubmission({
    pendingLabel: "Bezig met toevoegen…",
    successLabel: "Lead toegevoegd",
  });
  const disabled = !companyId;

  function syncTitleErrors(htmlForm: HTMLFormElement) {
    const parsed = safeParseDealTitleForm(new FormData(htmlForm));
    form.setFieldErrors(parsed.success ? {} : parsed.fieldErrors);
    if (parsed.success) form.setError(null);
  }

  async function onSubmit(formData: FormData) {
    if (disabled) return;
    await form.submit({
      formData,
      fieldOrder: ["title"],
      fieldElementId: (name) => `${id}-${name}`,
      uncertainMessage: LEAD_SAVE_UNCERTAIN_MESSAGE,
      validate: safeParseDealTitleForm,
      save: async (data) => {
        const saved = await createDealInlineAction(data);
        if (saved.error) {
          return { error: saved.error, fieldErrors: saved.fieldErrors };
        }
        if (saved.deal) return { result: saved.deal };
        return { error: "Er ging iets mis. Probeer het opnieuw." };
      },
      onSuccess: (deal) => {
        onCreated(deal);
        form.handleOpenChange(false, onOpenChange);
      },
    });
  }

  return (
    <DialogRoot
      open={open}
      onOpenChange={(next) => {
        if (disabled && next) return;
        form.handleOpenChange(next, onOpenChange);
      }}
    >
      <DialogContent size="md">
        <DialogHeader dismissible={form.status !== "submitting"}>
          <DialogTitle>Nieuwe lead</DialogTitle>
        </DialogHeader>
        <form ref={formRef} action={onSubmit} noValidate>
          <input type="hidden" name="submissionId" value={form.submissionId} />
          <input type="hidden" name="companyId" value={companyId} />
          {contactId ? (
            <input type="hidden" name="contactId" value={contactId} />
          ) : null}
          <DialogBody className="flex flex-col gap-3">
            <FormField
              id={`${id}-title`}
              label="Titel"
              error={form.shownErrors.title}
            >
              <Input
                name="title"
                defaultValue={defaultTitle ?? ""}
                onBlur={(event) => {
                  form.markTouched("title");
                  const htmlForm = event.currentTarget.form ?? formRef.current;
                  if (htmlForm) syncTitleErrors(htmlForm);
                }}
                onChange={(event) => {
                  if (form.submitted || form.shownErrors.title) {
                    const htmlForm = event.currentTarget.form ?? formRef.current;
                    if (htmlForm) syncTitleErrors(htmlForm);
                  }
                }}
              />
            </FormField>
            <FormStatus error={form.error} statusMessage={form.statusMessage} />
          </DialogBody>
          <DialogFooter>
            <LeadSubmitButton
              readyLabel="Toevoegen"
              pendingLabel="Bezig met toevoegen…"
              status={form.status}
            />
          </DialogFooter>
        </form>
      </DialogContent>
    </DialogRoot>
  );
}
