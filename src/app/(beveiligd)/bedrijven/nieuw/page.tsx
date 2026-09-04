import type { Metadata } from "next";
import Link from "next/link";
import { createCompanyAction } from "@/app/(beveiligd)/actions/company-actions";
import { CompanyForm } from "@/components/company/company-form";

export const metadata: Metadata = { title: "Nieuw bedrijf" };

export default function NieuwBedrijfPage() {
  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div className="page-header-copy">
          <h1 className="page-header-title">Nieuw bedrijf</h1>
          <p className="page-header-description">
            <Link href="/bedrijven" className="hover:underline">
              Terug naar bedrijven
            </Link>
          </p>
        </div>
      </header>
      <CompanyForm action={createCompanyAction} submitLabel="Bedrijf opslaan" />
    </div>
  );
}
