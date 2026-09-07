import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { formatEuroExact } from "@/lib/format";
import { quotePath } from "@/lib/paths";
import {
  formatEuroDelta,
  formatQuoteVersionNumber,
  lineTitle,
  type VersionDiff,
} from "@/lib/quote-version";

export function QuoteVersionCompare({
  quoteNumber,
  versions,
  selectedA,
  selectedB,
  diff,
}: {
  quoteNumber: string;
  versions: { versionNumber: number }[];
  selectedA?: number;
  selectedB?: number;
  diff: VersionDiff | null;
}) {
  if (versions.length < 2) return null;

  const defaultA = selectedA ?? versions[0]?.versionNumber;
  const defaultB =
    selectedB ?? versions[versions.length - 1]?.versionNumber;

  return (
    <section className="flex flex-col gap-4 rounded-md border border-border bg-surface px-4 py-3">
      <div>
        <h2 className="text-md font-medium text-fg">Vergelijk versies</h2>
        <p className="mt-1 text-sm text-fg-muted">
          Kies twee versies om regels, opties en het prijsverschil te zien.
        </p>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-sm text-fg-muted">
          Eerste versie
          <Select
            name="vergelijk"
            defaultValue={defaultA ? String(defaultA) : ""}
            className="min-w-40"
          >
            {versions.map((version) => (
              <option key={version.versionNumber} value={version.versionNumber}>
                {formatQuoteVersionNumber(quoteNumber, version.versionNumber)}
              </option>
            ))}
          </Select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-fg-muted">
          Tweede versie
          <Select
            name="met"
            defaultValue={defaultB ? String(defaultB) : ""}
            className="min-w-40"
          >
            {versions.map((version) => (
              <option key={version.versionNumber} value={version.versionNumber}>
                {formatQuoteVersionNumber(quoteNumber, version.versionNumber)}
              </option>
            ))}
          </Select>
        </label>
        <Button type="submit" variant="secondary">
          Vergelijken
        </Button>
      </form>

      {diff ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
            <p className="text-fg">
              {formatQuoteVersionNumber(quoteNumber, diff.versionA)}
              {" → "}
              {formatQuoteVersionNumber(quoteNumber, diff.versionB)}
            </p>
            <p className="text-fg-muted">
              {formatEuroExact(diff.totalA)}
              {" → "}
              {formatEuroExact(diff.totalB)}
              {" · "}
              <span className="text-fg">{formatEuroDelta(diff.totalDelta)}</span>
            </p>
          </div>

          {diff.added.length === 0 &&
          diff.removed.length === 0 &&
          diff.changed.length === 0 ? (
            <p className="text-sm text-fg-muted">
              Deze versies hebben dezelfde regels en bedragen.
            </p>
          ) : null}

          {diff.added.length > 0 ? (
            <div>
              <h3 className="text-sm font-medium text-fg">Toegevoegd</h3>
              <ul className="mt-1 flex flex-col gap-1">
                {diff.added.map((line, index) => (
                  <li
                    key={`added-${line.productId}-${index}`}
                    className="flex justify-between gap-3 text-sm text-fg-muted"
                  >
                    <span>{lineTitle(line)}</span>
                    <span>
                      {line.quantity} × {formatEuroExact(line.unitPrice)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {diff.removed.length > 0 ? (
            <div>
              <h3 className="text-sm font-medium text-fg">Verwijderd</h3>
              <ul className="mt-1 flex flex-col gap-1">
                {diff.removed.map((line, index) => (
                  <li
                    key={`removed-${line.productId}-${index}`}
                    className="flex justify-between gap-3 text-sm text-fg-muted"
                  >
                    <span>{lineTitle(line)}</span>
                    <span>
                      {line.quantity} × {formatEuroExact(line.unitPrice)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {diff.changed.length > 0 ? (
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-medium text-fg">Gewijzigd</h3>
              {diff.changed.map((row, index) => (
                <div
                  key={`changed-${row.after.productId}-${index}`}
                  className="rounded-sm bg-surface-sunk px-3 py-2"
                >
                  <p className="text-sm font-medium text-fg">
                    {lineTitle(row.after)}
                  </p>
                  <ul className="mt-1 flex flex-col gap-1">
                    {row.changes.map((change) => (
                      <li
                        key={change.field}
                        className="flex justify-between gap-3 text-sm text-fg-muted"
                      >
                        <span>{change.label}</span>
                        <span>
                          {change.before} → {change.after}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : null}

          <p>
            <a
              href={quotePath({ quoteNumber })}
              className="text-sm text-fg-muted hover:underline"
            >
              Vergelijking sluiten
            </a>
          </p>
        </div>
      ) : null}
    </section>
  );
}
