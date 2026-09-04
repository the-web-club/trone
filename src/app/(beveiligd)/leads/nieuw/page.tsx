import type { Metadata } from "next";
import Link from "next/link";
import { createDealAction } from "@/app/(beveiligd)/actions/deal-actions";
import { DealForm } from "@/components/deal/deal-form";
import { listCompanies } from "@/lib/company-service";
import { listContacts } from "@/lib/contact-service";
import { listDealStages, listLeadSources } from "@/lib/deal-service";

export const metadata: Metadata = { title: "Nieuwe lead" };

export default async function NieuweLeadPage() {
  const [stages, sources, companies, contacts] = await Promise.all([
    listDealStages(),
    listLeadSources(),
    listCompanies(),
    listContacts(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div className="page-header-copy">
          <h1 className="page-header-title">Nieuwe lead</h1>
          <p className="page-header-description">
            <Link href="/leads" className="hover:underline">
              Terug naar de pijplijn
            </Link>
          </p>
        </div>
      </header>
      <DealForm
        action={createDealAction}
        submitLabel="Lead opslaan"
        stages={stages}
        sources={sources}
        companies={companies.map((company) => ({
          id: company.id,
          name: company.name,
        }))}
        contacts={contacts.map((contact) => ({
          id: contact.id,
          firstName: contact.firstName,
          lastName: contact.lastName,
          companyId: contact.companyId,
        }))}
      />
    </div>
  );
}
