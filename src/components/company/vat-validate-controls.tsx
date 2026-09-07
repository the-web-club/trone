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
  vatNumber,
  country,
  initialStatus,
  initialName,
  initialCheckedAt,
  onAppliedVatRate,
  onSuccess,
}: {
  companyId: string;
  vatNumber?: string | null;
  country: string;
  initialStatus?: boolean | null;
  initialName?: string | null;
  initialCheckedAt?: Date | string | null;
  onAppliedVatRate?: (rate: number) => void;
  onSuccess?: () => void;
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
  const [fromServerStatus, setFromServerStatus] = useState(initialStatus);
  const [fromServerName, setFromServerName] = useState(initialName ?? null);
  const [fromServerCheckedAt, setFromServerCheckedAt] = useState(
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

  if (initialStatus !== fromServerStatus) {
    setFromServerStatus(initialStatus);
    setStatus(
      initialStatus === true ? "GELDIG" : initialStatus === false ? "ONGELDIG" : null,
    );
  }
  if ((initialName ?? null) !== fromServerName) {
    setFromServerName(initialName ?? null);
    setName(initialName ?? null);
  }
  const nextCheckedAt = initialCheckedAt
    ? initialCheckedAt instanceof Date
      ? initialCheckedAt.toISOString()
      : initialCheckedAt
    : null;
  if (nextCheckedAt !== fromServerCheckedAt) {
    setFromServerCheckedAt(nextCheckedAt);
    setCheckedAt(nextCheckedAt);
  }

  async function run(applyProposedRate: boolean) {
    const data = new FormData();
    data.set("id", companyId);
    data.set("vatNumber", vatNumber ?? "");
    data.set("country", country);
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
      onAppliedVatRate?.(result.appliedVatRate);
    }
    onSuccess?.();
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
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
            size="sm"
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
