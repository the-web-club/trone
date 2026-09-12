import type { Metadata } from "next";
import { QuoteForm } from "@/components/quote/quote-form";
import { PageHeader, PageHeaderNavLink } from "@/components/shell/page-header";
import {
  getQuoteComposerData,
  resolveQuoteComposerLinks,
} from "@/lib/quote-service";

export const metadata: Metadata = { title: "Nieuwe offerte" };

export default async function NieuweOffertePage({
  searchParams,
}: {
  searchParams: Promise<{ company?: string; deal?: string }>;
}) {
  const { company, deal } = await searchParams;
  const { companyId, dealId } = await resolveQuoteComposerLinks({
    company,
    deal,
  });
  const data = await getQuoteComposerData({ companyId });

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Nieuwe offerte"
        nav={
          <PageHeaderNavLink href="/offertes">
            Terug naar offertes
          </PageHeaderNavLink>
        }
        description="Configureer één stoel tegelijk. De prijs volgt live mee."
      />
      <QuoteForm
        catalog={data.catalog}
        companies={data.companies}
        contacts={data.contacts}
        deals={data.deals}
        initialCompanyId={companyId}
        initialDealId={dealId}
      />
    </div>
  );
}
