"use client";

import { useState } from "react";
import { validateCompanyVatAction } from "@/app/(beveiligd)/actions/company-actions";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import {
  VAT_REGIME_LABELS,
  type VatRegime,
  type ViesStatus,
} from "@/lib/vat";

const STATUS_LABELS: Record<ViesStatus, string> = {
  GELDIG: "Geldig",
  ONGELDIG: "Ongeldig",
  ONBEKEND: "Onbekend",
};

export function VatValidateControls({
  companyId,
  initialStatus,
  initialName,
  initialCheckedAt,
}: {
  companyId: string;
  initialStatus?: boolean | null;
  initialName?: string | null;
  initialCheckedAt?: Date | string | null;
}) {
  const [pending, setPending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<ViesStatus | null>(
    initialStatus === true ? "GELDIG" : initialStatus === false ? "ONGELDIG" : null,
  );
  const [name, setName] = useState(initialName ?? null);
  const [checkedAt, setCheckedAt] = useState<string | null>(
    initialCheckedAt
      ? initialCheckedAt instanceof Date
        ? initialCheckedAt.toISOString()
        : initialCheckedAt
      : null,
  );
  const [warning, setWarning] = useState<string | null>(null);
  const [mention, setMention] = useState<string | null>(null);
  const [vatRegime, setVatRegime] = useState<VatRegime | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  async function run(applyProposedRate: boolean) {
    const form = document.getElementById("company-form") as HTMLFormElement | null;
    if (!form) {
      setError("Formulier niet gevonden.");
      return;
    }
    const data = new FormData(form);
    data.set("id", companyId);
    data.set("applyProposedRate", applyProposedRate ? "true" : "false");
    setPending(true);
    setError(null);
    const result = await validateCompanyVatAction(data);
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setStatus(result.status ?? null);
    setName(result.name ?? null);
    setCheckedAt(result.checkedAt ?? null);
    setWarning(result.warning ?? null);
    setMention(result.mention ?? null);
    setVatRegime(result.vatRegime ?? null);
    setNeedsConfirmation(Boolean(result.needsConfirmation));
    if (result.appliedVatRate != null) {
      const vatInput = form.querySelector<HTMLInputElement>('input[name="vatRate"]');
      if (vatInput) vatInput.value = String(result.appliedVatRate);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          loading={pending && !confirming}
          onClick={() => {
            setConfirming(false);
            void run(false);
          }}
        >
          Btw-nummer valideren
        </Button>
        {needsConfirmation ? (
          <Button
            type="button"
            loading={pending && confirming}
            onClick={() => {
              setConfirming(true);
              void run(true);
            }}
          >
            Zet tarief op 0% (verlegd)
          </Button>
        ) : null}
      </div>
      {status ? (
        <div className="text-sm text-fg-muted">
          <p>
            VIES: <span className="text-fg">{STATUS_LABELS[status]}</span>
            {vatRegime ? ` · ${VAT_REGIME_LABELS[vatRegime]}` : null}
          </p>
          {name ? <p>Naam bij VIES: {name}</p> : null}
          {checkedAt ? (
            <p>Gecontroleerd: {formatDateTime(new Date(checkedAt))}</p>
          ) : null}
          {mention ? <p>{mention}</p> : null}
        </div>
      ) : null}
      {warning ? (
        <p className="text-sm text-warning" role="status">
          {warning}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
