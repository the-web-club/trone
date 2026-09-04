import type { Metadata } from "next";
import Link from "next/link";
import { QuoteForm } from "@/components/quote/quote-form";
import { getQuoteComposerData } from "@/lib/quote-service";

export const metadata: Metadata = { title: "Nieuwe offerte" };

export default async function NieuweOffertePage({
  searchParams,
}: {
  searchParams: Promise<{ company?: string; deal?: string }>;
}) {
  const { company, deal } = await searchParams;
  const data = await getQuoteComposerData();

  return (
    <div className="flex flex-col gap-8">
      <header className="page-header">
        <div className="page-header-copy">
          <h1 className="page-header-title">Nieuwe offerte</h1>
          <p className="page-header-description">
            <Link href="/offertes" className="hover:underline">
              Terug naar offertes
            </Link>
            {" · "}
            Configureer één stoel tegelijk. De prijs volgt live mee.
          </p>
        </div>
      </header>
      <QuoteForm
        catalog={data.catalog}
        companies={data.companies}
        contacts={data.contacts}
        deals={data.deals}
        initialCompanyId={company}
        initialDealId={deal}
      />
    </div>
  );
}
