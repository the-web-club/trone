"use client";

import { type ReactElement, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { createFeatureRequestAction } from "@/app/(beveiligd)/actions/feature-request-actions";
import { FormStatus } from "@/components/form/form-status";
import { useFormSubmission } from "@/components/form/use-form-submission";
import { Button } from "@/components/ui/button";
import {
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SubmitStatusButton } from "@/components/ui/submit-status-button";
import { Textarea } from "@/components/ui/textarea";
import {
  FEATURE_REQUEST_DESCRIPTION_HELP,
  FEATURE_REQUEST_DESCRIPTION_MAX,
  FEATURE_REQUEST_TITLE_MAX,
  featureRequestTypeLabels,
  featureRequestTypes,
  safeParseCreateFeatureRequestForm,
} from "@/lib/feature-request-validation";
import { refreshAfterSuccess } from "@/lib/form-submission";

export function CreateFeatureRequestDialog({
  trigger,
}: {
  trigger?: ReactElement;
}) {
  const router = useRouter();
  const fieldId = useId();
  const form = useFormSubmission({
    pendingLabel: "Plaatsen…",
    successLabel: "Geplaatst",
  });
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  function resetFields() {
    setType("");
    setTitle("");
    setDescription("");
  }

  function onOpenChange(next: boolean) {
    form.handleOpenChange(next, (value) => {
      setOpen(value);
      if (!value && form.status === "success") resetFields();
    });
  }

  async function onSubmit(formData: FormData) {
    await form.submit({
      formData,
      fieldOrder: ["type", "title", "description"],
      fieldElementId: (name) => `${fieldId}-${name}`,
      validate: safeParseCreateFeatureRequestForm,
      save: async (data) => {
        const saved = await createFeatureRequestAction(null, data);
        if (saved.error) {
          return { error: saved.error, fieldErrors: saved.fieldErrors };
        }
        return { result: { slug: saved.slug, createdAt: saved.createdAt } };
      },
      onSuccess: () => {
        resetFields();
        onOpenChange(false);
        refreshAfterSuccess(() => router.refresh());
      },
    });
  }

  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      <DialogTrigger
        render={
          trigger ?? (
            <Button type="button" aria-label="Nieuw verzoek">
              Nieuw verzoek
            </Button>
          )
        }
      />
      <DialogContent>
        <DialogHeader dismissible={form.status !== "submitting"}>
          <DialogTitle>Nieuw verzoek</DialogTitle>
          <p className="text-sm text-fg-muted">
            Beschrijf de verbetering. Andere teamleden kunnen meestemmen.
          </p>
        </DialogHeader>
        <form action={onSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
          <input type="hidden" name="submissionId" value={form.submissionId} />
          <DialogBody className="flex flex-col gap-3">
            <FormField
              id={`${fieldId}-type`}
              label="Type"
              error={form.shownErrors.type}
            >
              <Select
                name="type"
                value={type}
                onChange={(event) => {
                  setType(event.target.value);
                  form.markTouched("type");
                }}
                onBlur={() => form.markTouched("type")}
              >
                <option value="">Kies een type…</option>
                {featureRequestTypes.map((value) => (
                  <option key={value} value={value}>
                    {featureRequestTypeLabels[value]}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField
              id={`${fieldId}-title`}
              label="Titel"
              error={form.shownErrors.title}
              aside={
                <span className="text-xs text-fg-subtle tabular-nums">
                  {title.trim().length}/{FEATURE_REQUEST_TITLE_MAX}
                </span>
              }
            >
              <Input
                name="title"
                maxLength={FEATURE_REQUEST_TITLE_MAX}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                onBlur={() => form.markTouched("title")}
                placeholder="Korte samenvatting"
              />
            </FormField>
            <FormField
              id={`${fieldId}-description`}
              label="Omschrijving"
              error={form.shownErrors.description}
              aside={
                <span className="text-xs text-fg-subtle tabular-nums">
                  {description.length}/{FEATURE_REQUEST_DESCRIPTION_MAX}
                </span>
              }
            >
              <Textarea
                name="description"
                maxLength={FEATURE_REQUEST_DESCRIPTION_MAX}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="min-h-28"
                aria-describedby={`${fieldId}-description-help`}
              />
            </FormField>
            <p
              id={`${fieldId}-description-help`}
              className="text-xs text-fg-muted"
            >
              {FEATURE_REQUEST_DESCRIPTION_HELP}
            </p>
            <FormStatus error={form.error} statusMessage={form.statusMessage} />
          </DialogBody>
          <DialogFooter>
            <SubmitStatusButton
              readyLabel="Verzoek plaatsen"
              pendingLabel="Plaatsen…"
              successLabel="Geplaatst"
              status={form.status}
            />
          </DialogFooter>
        </form>
      </DialogContent>
    </DialogRoot>
  );
}
