"use client";

import { useId, useRef, useState } from "react";
import { createDealInlineAction } from "@/app/(beveiligd)/actions/deal-actions";
import type { CreatedDealOption } from "@/app/(beveiligd)/actions/deal-actions";
import { LeadSubmitButton } from "@/components/deal/lead-submit-button";
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
  firstInvalidDealField,
  safeParseDealTitleForm,
  type DealFieldErrors,
} from "@/lib/deal-validation";
import {
  createSubmissionGuard,
  createSubmissionId,
  submitLeadCreation,
  visibleDealFieldErrors,
} from "@/lib/lead-submission";

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
  const guardRef = useRef(createSubmissionGuard());
  const [submissionId, setSubmissionId] = useState(createSubmissionId);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<DealFieldErrors>({});
  const [touched, setTouched] = useState({ title: false });
  const [submitted, setSubmitted] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "success">(
    "idle",
  );
  const disabled = !companyId;
  const shownErrors = visibleDealFieldErrors(fieldErrors, touched, submitted);

  function beginNewSubmission() {
    guardRef.current = createSubmissionGuard();
    setSubmissionId(createSubmissionId());
    setStatus("idle");
    setError(null);
    setFieldErrors({});
    setTouched({ title: false });
    setSubmitted(false);
  }

  function syncTitleErrors(form: HTMLFormElement) {
    const parsed = safeParseDealTitleForm(new FormData(form));
    setFieldErrors(parsed.success ? {} : parsed.fieldErrors);
    if (parsed.success) setError(null);
  }

  async function onSubmit(formData: FormData) {
    if (disabled) return;

    const result = await submitLeadCreation({
      guard: guardRef.current,
      formData,
      validate: safeParseDealTitleForm,
      save: (data) => createDealInlineAction(data),
      onStart: () => {
        setStatus("submitting");
        setError(null);
      },
    });

    if (result.status === "ignored") return;

    if (result.status === "invalid") {
      setSubmitted(true);
      setStatus("idle");
      setFieldErrors(result.fieldErrors);
      setError(result.formError);
      const first = firstInvalidDealField(result.fieldErrors);
      if (first) document.getElementById(`${id}-${first}`)?.focus();
      return;
    }

    if (result.status === "failed") {
      setSubmitted(true);
      setStatus("idle");
      if (result.fieldErrors) setFieldErrors(result.fieldErrors);
      setError(result.error);
      return;
    }

    if (result.status === "uncertain") {
      setStatus("idle");
      setError(result.error);
      return;
    }

    setError(null);
    setFieldErrors({});
    setStatus("success");
    onCreated(result.deal);
    onOpenChange(false);
  }

  const statusMessage =
    status === "submitting"
      ? "Bezig met toevoegen…"
      : status === "success"
        ? "Lead toegevoegd"
        : error;

  return (
    <DialogRoot
      open={open}
      onOpenChange={(next) => {
        if (disabled && next) return;
        if (next && (status === "success" || (status === "idle" && !error))) {
          beginNewSubmission();
        }
        onOpenChange(next);
        if (!next && status === "success") beginNewSubmission();
      }}
    >
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Nieuwe lead</DialogTitle>
        </DialogHeader>
        <form ref={formRef} action={onSubmit} noValidate>
          <input type="hidden" name="submissionId" value={submissionId} />
          <input type="hidden" name="companyId" value={companyId} />
          {contactId ? (
            <input type="hidden" name="contactId" value={contactId} />
          ) : null}
          <DialogBody className="flex flex-col gap-3">
            <FormField id={`${id}-title`} label="Titel" error={shownErrors.title}>
              <Input
                name="title"
                defaultValue={defaultTitle ?? ""}
                onBlur={(event) => {
                  setTouched({ title: true });
                  const form = event.currentTarget.form ?? formRef.current;
                  if (form) syncTitleErrors(form);
                }}
                onChange={(event) => {
                  if (submitted || touched.title) {
                    const form = event.currentTarget.form ?? formRef.current;
                    if (form) syncTitleErrors(form);
                  }
                }}
              />
            </FormField>
            {error ? (
              <p className="text-sm text-danger" role="alert">
                {error}
              </p>
            ) : null}
            <p className="sr-only" aria-live="polite">
              {statusMessage}
            </p>
          </DialogBody>
          <DialogFooter>
            <LeadSubmitButton
              readyLabel="Toevoegen"
              pendingLabel="Bezig met toevoegen…"
              status={status}
            />
          </DialogFooter>
        </form>
      </DialogContent>
    </DialogRoot>
  );
}
