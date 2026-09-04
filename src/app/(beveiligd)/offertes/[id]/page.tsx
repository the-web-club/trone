import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { QuoteLines } from "@/components/quote/quote-lines";
import { QuoteVersionActions } from "@/components/quote/quote-version-actions";
import { QuoteVersionCompare } from "@/components/quote/quote-version-compare";
import { QuoteVersionHistory } from "@/components/quote/quote-version-history";
import { isAppError } from "@/lib/errors";
import { formatDate, formatPersonName } from "@/lib/format";
import {
  compareVersions,
  getQuoteWithVersions,
} from "@/lib/quote-service";
import { formatQuoteVersionNumber } from "@/lib/quote-version";
import { quoteStatusLabels, quoteStatusTones } from "@/lib/quote-validation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  try {
    const { id } = await params;
    const quote = await getQuoteWithVersions(id);
    const label = formatQuoteVersionNumber(
      quote.quoteNumber,
      quote.currentVersionNumber,
    );
    return { title: label };
  } catch {
    return { title: "Offerte" };
  }
}

function parseVersionParam(value?: string): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export default async function OfferteDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ versie?: string; vergelijk?: string; met?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const quote = await getQuoteWithVersions(id).catch((error) => {
    if (isAppError(error) && error.status === 404) notFound();
    throw error;
  });

  const requestedVersion = parseVersionParam(query.versie);
  const compareA = parseVersionParam(query.vergelijk);
  const compareB = parseVersionParam(query.met);
  const viewedVersion = requestedVersion
    ? quote.versions.find((version) => version.versionNumber === requestedVersion)
    : undefined;

  if (requestedVersion && !viewedVersion) notFound();

  const viewingHistorical = Boolean(
    viewedVersion && viewedVersion.versionNumber !== quote.currentVersionNumber,
  );
  const displayVersion = viewingHistorical ? viewedVersion : undefined;
  const displayItems = displayVersion ? displayVersion.items : quote.items;
  const displayStatus = displayVersion?.status ?? quote.status;
  const displayVersionNumber = displayVersion
    ? displayVersion.versionNumber
    : quote.currentVersionNumber;
  const displaySubtotal = Number(displayVersion?.subtotal ?? quote.subtotal);
  const displayDiscount = Number(
    displayVersion?.discountTotal ?? quote.discountTotal,
  );
  const displayTotal = Number(displayVersion?.total ?? quote.total);
  const versionLabel = formatQuoteVersionNumber(
    quote.quoteNumber,
    displayVersionNumber,
  );

  const diff =
    compareA && compareB
      ? await compareVersions(quote.id, compareA, compareB).catch((error) => {
          if (
            isAppError(error) &&
            (error.code === "VALIDATION" || error.status === 404)
          ) {
            return null;
          }
          throw error;
        })
      : null;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={versionLabel}
        description={
          <>
            <Link href="/offertes" className="hover:underline">
              Terug naar offertes
            </Link>
            {" · "}
            <span>{quote.quoteNumber}</span>
            {displayVersionNumber > 0 ? ` · v${displayVersionNumber}` : null}
            {" · "}
            <Link href={`/bedrijven/${quote.company.id}`} className="hover:underline">
              {quote.company.name}
            </Link>
            {quote.contact
              ? ` · ${formatPersonName(quote.contact.firstName, quote.contact.lastName)}`
              : null}
            {quote.deal ? (
              <>
                {" · "}
                <Link href={`/leads/${quote.deal.id}`} className="hover:underline">
                  {quote.deal.title}
                </Link>
              </>
            ) : null}
            {` · ${formatDate(quote.createdAt)}`}
          </>
        }
        actions={
          <Badge tone={quoteStatusTones[displayStatus]}>
            {quoteStatusLabels[displayStatus]}
          </Badge>
        }
      />

      <QuoteVersionActions
        quoteId={quote.id}
        status={quote.status}
        viewingHistorical={viewingHistorical}
      />

      {viewingHistorical ? (
        <p className="text-sm text-fg-muted">
          Alleen-lezen weergave van{" "}
          {formatQuoteVersionNumber(quote.quoteNumber, displayVersionNumber)}.
          {" "}
          <Link href={`/offertes/${quote.id}`} className="hover:underline">
            Terug naar de huidige versie
          </Link>
        </p>
      ) : null}

      <QuoteLines
        items={displayItems}
        vatRate={Number(quote.company.vatRate)}
        subtotal={displaySubtotal}
        discountTotal={displayDiscount}
        total={displayTotal}
      />

      <QuoteVersionHistory
        quoteId={quote.id}
        quoteNumber={quote.quoteNumber}
        versions={quote.versions}
        activeVersionNumber={
          viewingHistorical
            ? displayVersionNumber
            : quote.currentVersionNumber || null
        }
      />

      <QuoteVersionCompare
        quoteId={quote.id}
        quoteNumber={quote.quoteNumber}
        versions={quote.versions}
        selectedA={compareA}
        selectedB={compareB}
        diff={diff}
      />
    </div>
  );
}
