import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { QuoteForm } from "@/components/quote/quote-form";
import { PageHeader } from "@/components/shell/page-header";
import { isAppError } from "@/lib/errors";
import { quotePath } from "@/lib/paths";
import { getQuote, getQuoteComposerData } from "@/lib/quote-service";
import { toQuoteItemInput } from "@/lib/quote-version";
import { formatQuoteVersionNumber } from "@/lib/quote-version";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  try {
    const { slug } = await params;
    const quote = await getQuote(slug);
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
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const quote = await getQuote(slug).catch((error) => {
    if (isAppError(error) && error.status === 404) notFound();
    throw error;
  });

  if (slug !== quote.quoteNumber) {
    redirect(`${quotePath(quote)}/bewerken`);
  }

  if (quote.status !== "DRAFT") {
    redirect(quotePath(quote));
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
    redirect(quotePath(quote));
  }

  const data = await getQuoteComposerData({ companyId: quote.companyId });

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={`${formatQuoteVersionNumber(quote.quoteNumber, quote.currentVersionNumber)} bewerken`}
        description={
          <>
            <Link href={quotePath(quote)} className="hover:underline">
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
