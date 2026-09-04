import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { QuoteForm } from "@/components/quote/quote-form";
import { PageHeader } from "@/components/shell/page-header";
import { isAppError } from "@/lib/errors";
import { getQuote, getQuoteComposerData } from "@/lib/quote-service";
import { toQuoteItemInput } from "@/lib/quote-version";
import { formatQuoteVersionNumber } from "@/lib/quote-version";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  try {
    const { id } = await params;
    const quote = await getQuote(id);
    return {
      title: `Bewerken ${formatQuoteVersionNumber(quote.quoteNumber, quote.currentVersionNumber)}`,
    };
  } catch {
    return { title: "Offerte bewerken" };
  }
}

export default async function OfferteBewerkenPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const quote = await getQuote(id).catch((error) => {
    if (isAppError(error) && error.status === 404) notFound();
    throw error;
  });

  if (quote.status !== "DRAFT") {
    redirect(`/offertes/${quote.id}`);
  }

  const items = quote.items
    .map((item) =>
      toQuoteItemInput({
        productId: item.productId,
        quantity: item.quantity,
        configSnapshot: item.configSnapshot,
      }),
    )
    .filter((item): item is NonNullable<typeof item> => item != null);

  if (items.length === 0) {
    redirect(`/offertes/${quote.id}`);
  }

  const data = await getQuoteComposerData();

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={`${formatQuoteVersionNumber(quote.quoteNumber, quote.currentVersionNumber)} bewerken`}
        description={
          <>
            <Link href={`/offertes/${quote.id}`} className="hover:underline">
              Terug naar offerte
            </Link>
            {" · "}
            Concept. Bij versturen wordt de huidige staat vastgelegd.
          </>
        }
      />
      <QuoteForm
        catalog={data.catalog}
        companies={data.companies}
        contacts={data.contacts}
        deals={data.deals}
        quoteId={quote.id}
        initialCompanyId={quote.companyId}
        initialContactId={quote.contactId ?? undefined}
        initialDealId={quote.dealId ?? undefined}
        initialItems={items}
      />
    </div>
  );
}
