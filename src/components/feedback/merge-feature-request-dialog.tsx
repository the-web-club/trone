"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { mergeFeatureRequestAction } from "@/app/(beveiligd)/actions/feature-request-actions";
import { FormStatus } from "@/components/form/form-status";
import { useFormSubmission } from "@/components/form/use-form-submission";
import { ComboboxMenu } from "@/components/ui/combobox";
import {
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { SubmitStatusButton } from "@/components/ui/submit-status-button";
import { refreshAfterSuccess, requiredField } from "@/lib/form-submission";
import type { FeatureRequestMergeTarget } from "@/lib/feature-request-service";

export function MergeFeatureRequestDialog({
  sourceId,
  targets,
  open,
  onOpenChange,
}: {
  sourceId: string;
  targets: FeatureRequestMergeTarget[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const fieldId = useId();
  const form = useFormSubmission({
    pendingLabel: "Samenvoegen…",
    successLabel: "Samengevoegd",
  });
  const [targetId, setTargetId] = useState("");

  function setOpen(next: boolean) {
    form.handleOpenChange(next, (value) => {
      onOpenChange(value);
      if (!value) setTargetId("");
    });
  }

  async function onSubmit(formData: FormData) {
    await form.submit({
      formData,
      fieldOrder: ["targetId"],
      fieldElementId: () => `${fieldId}-target`,
      validate: (data) =>
        requiredField(data, "targetId", "Kies een verzoek om mee samen te voegen."),
      save: async (data) => {
        const saved = await mergeFeatureRequestAction(null, data);
        if (saved.error) return { error: saved.error };
        return { result: { mergedAt: saved.mergedAt } };
      },
      onSuccess: () => {
        setTargetId("");
        setOpen(false);
        refreshAfterSuccess(() => router.refresh());
      },
    });
  }

  return (
    <DialogRoot open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader dismissible={form.status !== "submitting"}>
          <DialogTitle>Verzoeken samenvoegen</DialogTitle>
          <p className="text-sm text-fg-muted">
            Stemmen worden uniek samengevoegd op het doelverzoek. Dit verzoek
            blijft bereikbaar als samengevoegd.
          </p>
        </DialogHeader>
        <form action={onSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
          <input type="hidden" name="sourceId" value={sourceId} />
          <input type="hidden" name="targetId" value={targetId} />
          <DialogBody className="flex flex-col gap-3">
            <FormField
              id={`${fieldId}-target`}
              label="Samenvoegen met"
              error={form.shownErrors.targetId}
            >
              <ComboboxMenu
                value={targetId}
                onValueChange={(next) => {
                  setTargetId(next);
                  form.markTouched("targetId");
                }}
                items={[
                  { value: "", label: "Kies een verzoek…" },
                  ...targets.map((target) => ({
                    value: target.id,
                    label: target.title,
                  })),
                ]}
                placeholder="Kies een verzoek…"
                searchPlaceholder="Zoek een verzoek…"
                emptyLabel="Geen ander verzoek gevonden"
              />
            </FormField>
            <FormStatus error={form.error} statusMessage={form.statusMessage} />
          </DialogBody>
          <DialogFooter>
            <SubmitStatusButton
              readyLabel="Samenvoegen"
              pendingLabel="Samenvoegen…"
              successLabel="Samengevoegd"
              status={form.status}
            />
          </DialogFooter>
        </form>
      </DialogContent>
    </DialogRoot>
  );
}
