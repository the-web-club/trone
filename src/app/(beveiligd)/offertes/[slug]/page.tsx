import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { CreateOrderDialog } from "@/components/order/create-order-dialog";
import { QuoteLines } from "@/components/quote/quote-lines";
import { QuoteVersionActions } from "@/components/quote/quote-version-actions";
import { QuoteVersionCompare } from "@/components/quote/quote-version-compare";
import { QuoteVersionHistory } from "@/components/quote/quote-version-history";
import { isAppError } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import { findOrderByQuoteId } from "@/lib/order-service";
import { CompanyLink, ContactLink, DealLink } from "@/components/entity-links";
import { orderPath, quotePath, quotePdfPath } from "@/lib/paths";
import {
  compareVersions,
  getQuoteWithVersions,
} from "@/lib/quote-service";
import { formatQuoteVersionNumber } from "@/lib/quote-version";
import { quoteStatusLabels, quoteStatusTones } from "@/lib/quote-validation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  try {
    const { slug } = await params;
    const quote = await getQuoteWithVersions(slug);
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
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ versie?: string; vergelijk?: string; met?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const quote = await getQuoteWithVersions(slug).catch((error) => {
    if (isAppError(error) && error.status === 404) notFound();
    throw error;
  });
  if (slug !== quote.quoteNumber) redirect(quotePath(quote));
  const existingOrder = await findOrderByQuoteId(quote.id);

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
            <CompanyLink company={quote.company} />
            {quote.contact ? (
              <>
                {" · "}
                <ContactLink contact={quote.contact} />
              </>
            ) : null}
            {quote.deal ? (
              <>
                {" · "}
                <DealLink deal={quote.deal} />
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
        quoteNumber={quote.quoteNumber}
        status={quote.status}
        viewingHistorical={viewingHistorical}
        pdfHref={quotePdfPath(
          quote,
          viewingHistorical ? { versie: displayVersionNumber } : undefined,
        )}
      />

      {!viewingHistorical && existingOrder ? (
        <p className="text-sm text-fg-muted">
          Order{" "}
          <Link
            href={orderPath(existingOrder)}
            className="font-medium text-fg hover:underline"
          >
            {existingOrder.orderNumber}
          </Link>
        </p>
      ) : null}

      {!viewingHistorical && quote.status === "ACCEPTED" && !existingOrder ? (
        <CreateOrderDialog
          quoteId={quote.id}
          items={quote.items.map((item) => ({
            id: item.id,
            description: item.description,
            quantity: item.quantity,
            unitPrice: Number(item.unitPrice),
            lineTotal: Number(item.lineTotal),
            configSnapshot: item.configSnapshot,
          }))}
        />
      ) : null}

      {viewingHistorical ? (
        <p className="text-sm text-fg-muted">
          Alleen-lezen weergave van{" "}
          {formatQuoteVersionNumber(quote.quoteNumber, displayVersionNumber)}.
          {" "}
          <Link href={quotePath(quote)} className="hover:underline">
            Terug naar de huidige versie
          </Link>
        </p>
      ) : null}

      <QuoteLines
        items={displayItems}
        vatRate={Number(
          displayVersion?.vatRate ?? quote.vatRate ?? quote.company.vatRate,
        )}
        vatRegime={displayVersion?.vatRegime ?? quote.vatRegime}
        vatNotice={displayVersion?.vatNotice ?? quote.vatNotice}
        subtotal={displaySubtotal}
        discountTotal={displayDiscount}
        total={displayTotal}
      />

      <QuoteVersionHistory
        quoteNumber={quote.quoteNumber}
        versions={quote.versions}
        activeVersionNumber={
          viewingHistorical
            ? displayVersionNumber
            : quote.currentVersionNumber || null
        }
      />

      <QuoteVersionCompare
        quoteNumber={quote.quoteNumber}
        versions={quote.versions}
        selectedA={compareA}
        selectedB={compareB}
        diff={diff}
      />
    </div>
  );
}
