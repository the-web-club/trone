"use client";

import { useRef, useState } from "react";
import {
  createSubmissionGuard,
  createSubmissionId,
  firstInvalidField,
  submitFormAction,
  UNCERTAIN_SAVE_MESSAGE,
  visibleFieldErrors,
  type FieldErrors,
  type FormSaveResult,
  type FormSubmitClientResult,
} from "@/lib/form-submission";
import type { SubmitStatus } from "@/components/ui/submit-status-button";

export type FormSubmitStatus = SubmitStatus;

export function useFormSubmission(options?: {
  pendingLabel?: string;
  successLabel?: string;
}) {
  const guardRef = useRef(createSubmissionGuard());
  const [submissionId, setSubmissionId] = useState(createSubmissionId);
  const [status, setStatus] = useState<FormSubmitStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Partial<Record<string, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const pendingLabel = options?.pendingLabel ?? "Opslaan…";
  const successLabel = options?.successLabel ?? "Opgeslagen";

  const shownErrors = visibleFieldErrors(fieldErrors, touched, submitted);
  const busy = status === "submitting" || status === "success";

  function beginNewSubmission() {
    guardRef.current = createSubmissionGuard();
    setSubmissionId(createSubmissionId());
    setStatus("idle");
    setError(null);
    setFieldErrors({});
    setTouched({});
    setSubmitted(false);
  }

  function markTouched(name: string) {
    setTouched((current) => ({ ...current, [name]: true }));
  }

  function canClose() {
    return status !== "submitting";
  }

  function handleOpenChange(
    next: boolean,
    setOpen: (open: boolean) => void,
  ) {
    if (!next && !canClose()) return;
    if (next && (status === "success" || (status === "idle" && !error))) {
      beginNewSubmission();
    }
    setOpen(next);
    if (!next && status === "success") beginNewSubmission();
  }

  async function submit<TResult>(options: {
    formData: FormData;
    validate: (
      formData: FormData,
    ) =>
      | { success: true }
      | { success: false; fieldErrors: FieldErrors; formError: string };
    save: (formData: FormData) => Promise<FormSaveResult<TResult>>;
    onSuccess: (result: TResult) => void;
    uncertainMessage?: string;
    fieldOrder?: readonly string[];
    fieldElementId?: (name: string) => string;
  }): Promise<FormSubmitClientResult<TResult>> {
    if (!options.formData.get("submissionId")) {
      options.formData.set("submissionId", submissionId);
    }

    const result = await submitFormAction({
      guard: guardRef.current,
      formData: options.formData,
      validate: options.validate,
      save: options.save,
      uncertainMessage: options.uncertainMessage ?? UNCERTAIN_SAVE_MESSAGE,
      onStart: () => {
        setStatus("submitting");
        setError(null);
      },
    });

    if (result.status === "ignored") return result;

    if (result.status === "invalid") {
      setSubmitted(true);
      setStatus("idle");
      setFieldErrors(result.fieldErrors);
      setError(result.formError);
      const first = firstInvalidField(
        options.fieldOrder ?? Object.keys(result.fieldErrors),
        result.fieldErrors,
      );
      if (first) {
        document.getElementById(options.fieldElementId?.(first) ?? first)?.focus();
      }
      return result;
    }

    if (result.status === "failed") {
      setSubmitted(true);
      setStatus("idle");
      if (result.fieldErrors) setFieldErrors(result.fieldErrors);
      setError(result.error);
      const first = firstInvalidField(
        options.fieldOrder ?? Object.keys(result.fieldErrors ?? {}),
        result.fieldErrors ?? {},
      );
      if (first) {
        document.getElementById(options.fieldElementId?.(first) ?? first)?.focus();
      }
      return result;
    }

    if (result.status === "uncertain") {
      setStatus("idle");
      setError(result.error);
      return result;
    }

    setError(null);
    setFieldErrors({});
    setStatus("success");
    options.onSuccess(result.result);
    return result;
  }

  const statusMessage =
    status === "submitting"
      ? pendingLabel
      : status === "success"
        ? successLabel
        : error;

  return {
    submissionId,
    status,
    error,
    fieldErrors,
    shownErrors,
    busy,
    submitted,
    statusMessage,
    beginNewSubmission,
    markTouched,
    setFieldErrors,
    setError,
    canClose,
    handleOpenChange,
    submit,
  };
}
