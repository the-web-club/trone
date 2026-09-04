"use client";

import { Input } from "@/components/ui/input";

export function DateRangeFields({
  van,
  tot,
  onVan,
  onTot,
}: {
  van: string;
  tot: string;
  onVan: (value: string) => void;
  onTot: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-label font-medium text-fg-muted">Datumbereik</p>
      <div className="flex items-center gap-1.5">
        <Input
          type="date"
          aria-label="Van"
          value={van}
          onChange={(event) => onVan(event.target.value)}
          className="min-w-0 flex-1"
        />
        <span className="shrink-0 text-fg-subtle" aria-hidden>
          –
        </span>
        <Input
          type="date"
          aria-label="Tot"
          value={tot}
          onChange={(event) => onTot(event.target.value)}
          className="min-w-0 flex-1"
        />
      </div>
    </div>
  );
}
