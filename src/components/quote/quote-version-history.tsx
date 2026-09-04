import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatEuroExact } from "@/lib/format";
import { formatQuoteVersionNumber } from "@/lib/quote-version";
import { quoteStatusLabels, quoteStatusTones } from "@/lib/quote-validation";
import type { QuoteStatus } from "@/generated/prisma/client";
import { cn } from "@/lib/cn";

export type QuoteVersionSummary = {
  id: string;
  versionNumber: number;
  status: QuoteStatus;
  total: { toString(): string } | number;
  createdAt: Date;
  sentAt: Date | null;
};

export function QuoteVersionHistory({
  quoteId,
  quoteNumber,
  versions,
  activeVersionNumber,
}: {
  quoteId: string;
  quoteNumber: string;
  versions: QuoteVersionSummary[];
  activeVersionNumber: number | null;
}) {
  if (versions.length === 0) {
    return (
      <section className="rounded-md border border-border bg-surface px-4 py-3">
        <h2 className="text-md font-medium text-fg">Versiegeschiedenis</h2>
        <p className="mt-2 text-sm text-fg-muted">
          Nog geen vastgelegde versie. Bij versturen wordt dit v1.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-md border border-border bg-surface px-4 py-3">
      <h2 className="text-md font-medium text-fg">Versiegeschiedenis</h2>
      <ul className="mt-3 flex flex-col gap-1">
        {versions.map((version) => {
          const selected = version.versionNumber === activeVersionNumber;
          const href = `/offertes/${quoteId}?versie=${version.versionNumber}`;
          return (
            <li key={version.id}>
              <Link
                href={href}
                className={cn(
                  "flex flex-wrap items-center justify-between gap-2 rounded-sm px-2 py-2 text-sm",
                  "hover:bg-hover-subtle",
                  selected && "bg-selected-bg shadow-[inset_0_0_0_1px_var(--accent)]",
                )}
              >
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-fg">
                    {formatQuoteVersionNumber(quoteNumber, version.versionNumber)}
                  </span>
                  <Badge tone={quoteStatusTones[version.status]}>
                    {quoteStatusLabels[version.status]}
                  </Badge>
                </span>
                <span className="text-fg-muted">
                  {formatDate(version.sentAt ?? version.createdAt)}
                  {" · "}
                  {formatEuroExact(Number(version.total))}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
