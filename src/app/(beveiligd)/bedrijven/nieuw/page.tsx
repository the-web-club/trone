import type { Metadata } from "next";
import Link from "next/link";
import { createCompanyAction } from "@/app/(beveiligd)/actions/company-actions";
import { CompanyForm } from "@/components/company/company-form";
import { PageHeader } from "@/components/shell/page-header";

export const metadata: Metadata = { title: "Nieuw bedrijf" };

export default function NieuwBedrijfPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Nieuw bedrijf"
        description={
          <Link href="/bedrijven" className="hover:underline">
            Terug naar bedrijven
          </Link>
        }
      />
      <CompanyForm action={createCompanyAction} submitLabel="Bedrijf opslaan" />
    </div>
  );
}
