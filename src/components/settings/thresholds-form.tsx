"use client";

import { useActionState } from "react";
import { updateThresholdsAction } from "@/app/(beveiligd)/actions/settings-actions";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import type { Thresholds } from "@/lib/settings";

export function ThresholdsForm({
  thresholds,
  canManage,
}: {
  thresholds: Thresholds;
  canManage: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    updateThresholdsAction,
    null,
  );

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
      <FormField id="stilDagen" label="Dagen stilte (lead)">
        <Input
          name="stilDagen"
          type="number"
          min={1}
          step={1}
          defaultValue={thresholds.stilDagen}
          disabled={!canManage}
          required
        />
      </FormField>
      <FormField id="opvolgingMaanden" label="Maanden tot opvolging (na order)">
        <Input
          name="opvolgingMaanden"
          type="number"
          min={1}
          step={1}
          defaultValue={thresholds.opvolgingMaanden}
          disabled={!canManage}
          required
        />
      </FormField>
      <FormField id="hotWaarde" label="Hot-suggestie vanaf waarde (€)" className="col-span-2">
        <Input
          name="hotWaarde"
          type="number"
          min={0}
          step={1}
          defaultValue={thresholds.hotWaarde}
          disabled={!canManage}
          required
        />
      </FormField>
      </div>
      {state?.error ? (
        <p className="text-sm text-danger" role="alert">
          {state.error}
        </p>
      ) : null}
      {canManage ? (
        <div>
          <Button type="submit" loading={pending}>
            Drempels opslaan
          </Button>
        </div>
      ) : (
        <p className="text-sm text-fg-muted">
          Alleen een beheerder kan deze drempels wijzigen.
        </p>
      )}
    </form>
  );
}
