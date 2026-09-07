import { Badge } from "@/components/ui/badge";
import {
  VAT_REGIME_LABELS,
  VAT_WARNINGS,
  zeroRateWithoutValidVies,
  type VatRegime,
} from "@/lib/vat";

export function VatTreatmentNotice({
  vatRate,
  vatRegime,
  warning,
  stale,
}: {
  vatRate: number;
  vatRegime: VatRegime | null | undefined;
  warning?: string | null;
  stale?: boolean;
}) {
  const zeroWithoutVies = zeroRateWithoutValidVies({
    vatRate,
    vatRegime,
  });
  const messages = [
    stale ? VAT_WARNINGS.STALE_CACHE : null,
    warning,
    zeroWithoutVies ? VAT_WARNINGS.ZERO_WITHOUT_VIES : null,
  ].filter((message, index, list): message is string =>
    Boolean(message) && list.indexOf(message) === index,
  );

  return (
    <div className="flex flex-col gap-2">
      {vatRegime ? (
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            tone={
              vatRegime === "BINNENLANDS"
                ? "default"
                : vatRegime === "VERLEGD"
                  ? "info"
                  : "success"
            }
          >
            {VAT_REGIME_LABELS[vatRegime]}
          </Badge>
          <span className="text-sm text-fg-muted">Btw {vatRate}%</span>
        </div>
      ) : (
        <p className="text-sm text-fg-muted">Btw {vatRate}%</p>
      )}
      {messages.map((message) => (
        <p key={message} className="text-sm text-warning" role="status">
          {message}
        </p>
      ))}
    </div>
  );
}
