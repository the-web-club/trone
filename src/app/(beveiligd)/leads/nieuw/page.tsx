import type { Metadata } from "next";
import Link from "next/link";
import { createDealAction } from "@/app/(beveiligd)/actions/deal-actions";
import { DealForm } from "@/components/deal/deal-form";
import { PageHeader } from "@/components/shell/page-header";
import { listCompanies } from "@/lib/company-service";
import { listContactsForSelect } from "@/lib/contact-service";
import { listDealStages, listLeadSources } from "@/lib/deal-service";

export const metadata: Metadata = { title: "Nieuwe lead" };

export default async function NieuweLeadPage() {
  const [stages, sources, companies, contacts] = await Promise.all([
    listDealStages(),
    listLeadSources(),
    listCompanies(),
    listContactsForSelect(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Nieuwe lead"
        description={
          <Link href="/leads" className="hover:underline">
            Terug naar de pijplijn
          </Link>
        }
      />
      <DealForm
        action={createDealAction}
        submitLabel="Lead opslaan"
        stages={stages}
        sources={sources}
        companies={companies.map((company) => ({
          id: company.id,
          name: company.name,
        }))}
        contacts={contacts}
      />
    </div>
  );
}
