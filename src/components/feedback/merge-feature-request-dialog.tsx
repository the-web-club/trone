"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { mergeFeatureRequestAction } from "@/app/(beveiligd)/actions/feature-request-actions";
import { Button } from "@/components/ui/button";
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
  const [targetId, setTargetId] = useState("");
  const [state, formAction, pending] = useActionState(
    mergeFeatureRequestAction,
    null,
  );
  const notifiedAt = useRef<number | null>(null);

  useEffect(() => {
    if (!state?.mergedAt || notifiedAt.current === state.mergedAt) return;
    notifiedAt.current = state.mergedAt;
    onOpenChange(false);
    setTargetId("");
    router.refresh();
  }, [state?.mergedAt, onOpenChange, router]);

  return (
    <DialogRoot
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setTargetId("");
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Verzoeken samenvoegen</DialogTitle>
          <p className="text-sm text-fg-muted">
            Stemmen worden uniek samengevoegd op het doelverzoek. Dit verzoek
            blijft bereikbaar als samengevoegd.
          </p>
        </DialogHeader>
        <form action={formAction} className="flex min-h-0 flex-1 flex-col">
          <input type="hidden" name="sourceId" value={sourceId} />
          <input type="hidden" name="targetId" value={targetId} />
          <DialogBody className="flex flex-col gap-3">
            <FormField id={`${fieldId}-target`} label="Samenvoegen met">
              <ComboboxMenu
                value={targetId}
                onValueChange={setTargetId}
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
            {state?.error ? (
              <p className="text-sm text-danger" role="alert">
                {state.error}
              </p>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <Button type="submit" loading={pending} disabled={pending || !targetId}>
              Samenvoegen
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </DialogRoot>
  );
}
