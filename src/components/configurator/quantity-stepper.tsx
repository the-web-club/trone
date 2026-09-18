"use client";

import { Button } from "@/components/ui/button";

export function QuantityStepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-1">
      <p className="text-sm text-fg-muted">Aantal</p>
      <div role="group" aria-label="Aantal" className="flex items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          aria-label="Aantal verlagen"
          disabled={value <= 1}
          onClick={() => onChange(Math.max(1, value - 1))}
        >
          −
        </Button>
        <span
          className="min-w-8 text-center text-sm font-medium text-fg"
          aria-live="polite"
        >
          {value}
        </span>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          aria-label="Aantal verhogen"
          onClick={() => onChange(value + 1)}
        >
          +
        </Button>
      </div>
    </div>
  );
}
