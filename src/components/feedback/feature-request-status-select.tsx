"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { updateFeatureRequestStatusAction } from "@/app/(beveiligd)/actions/feature-request-actions";
import { SelectMenu } from "@/components/ui/select";
import { cn } from "@/lib/cn";
import {
  ASSIGNABLE_FEATURE_REQUEST_STATUSES,
  featureRequestStatusLabels,
  featureRequestStatusTones,
  type FeatureRequestStatus,
} from "@/lib/feature-request-validation";

const statusToneClassName: Record<
  (typeof featureRequestStatusTones)[FeatureRequestStatus],
  string
> = {
  default:
    "bg-surface-sunk text-fg-muted hover:bg-surface-sunk hover:text-fg-muted",
  info: "bg-info-bg text-info hover:bg-info-bg hover:text-info",
  warning: "bg-warning-bg text-warning hover:bg-warning-bg hover:text-warning",
  success: "bg-success-bg text-success hover:bg-success-bg hover:text-success",
};

export function FeatureRequestStatusSelect({
  requestId,
  status,
}: {
  requestId: string;
  status: FeatureRequestStatus;
}) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [fromServer, setFromServer] = useState(status);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (status !== fromServer) {
    setFromServer(status);
    setValue(status);
  }

  async function onValueChange(next: FeatureRequestStatus) {
    if (next === value) return;
    const previous = value;
    setValue(next);
    setPending(true);
    setError(null);

    const result = await updateFeatureRequestStatusAction(requestId, next);
    setPending(false);
    if (result.error) {
      setValue(previous);
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="min-w-0 shrink-0">
      <SelectMenu<FeatureRequestStatus>
        aria-label="Status wijzigen"
        value={value}
        onValueChange={onValueChange}
        items={ASSIGNABLE_FEATURE_REQUEST_STATUSES.map((option) => ({
          value: option,
          label: featureRequestStatusLabels[option],
        }))}
        size="sm"
        disabled={pending}
        searchPlaceholder="Zoek een status…"
        className={cn(
          "h-5 w-auto cursor-pointer border-transparent px-1.5 text-xs font-medium",
          statusToneClassName[featureRequestStatusTones[value]],
          "data-[popup-open]:border-border-strong data-[popup-open]:bg-surface data-[popup-open]:text-fg",
        )}
      />
      {error ? (
        <p className="mt-0.5 max-w-40 text-xs text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
