import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { updateCompanyAction } from "@/app/(beveiligd)/actions/company-actions";
import { CompanyForm } from "@/components/company/company-form";
import {
  CreateContactDialog,
  EditContactDialog,
} from "@/components/company/contact-form-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableEmptyRow,
  TableHeader,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import { getCompany } from "@/lib/company-service";
import { isAppError } from "@/lib/errors";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  try {
    const { id } = await params;
    const company = await getCompany(id);
    return { title: company.name };
  } catch {
    return { title: "Bedrijf" };
  }
}

export default async function BedrijfDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const company = await getCompany(id).catch((error) => {
    if (isAppError(error) && error.status === 404) notFound();
    throw error;
  });

  return (
    <div className="flex flex-col gap-8">
      <header className="page-header">
        <div className="page-header-copy">
          <h1 className="page-header-title">{company.name}</h1>
          <p className="page-header-description">
            <Link href="/bedrijven" className="hover:underline">
              Terug naar bedrijven
            </Link>
          </p>
        </div>
      </header>

      <section className="flex flex-col gap-4">
        <h2 className="text-md font-medium text-fg">Gegevens</h2>
        <CompanyForm
          action={updateCompanyAction}
          submitLabel="Wijzigingen opslaan"
          company={{
            id: company.id,
            name: company.name,
            email: company.email,
            vatNumber: company.vatNumber,
            cocNumber: company.cocNumber,
            website: company.website,
            phone: company.phone,
            addressLine: company.addressLine,
            postalCode: company.postalCode,
            city: company.city,
            country: company.country,
            vatRate: Number(company.vatRate),
            notes: company.notes,
          }}
        />
      </section>

      <section className="flex flex-col gap-4">
        <div className="page-header">
          <h2 className="text-md font-medium text-fg">Contacten</h2>
          <div className="page-actions">
            <CreateContactDialog companyId={company.id} />
          </div>
        </div>

        <TableContainer>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHeaderCell>Naam</TableHeaderCell>
                <TableHeaderCell>Functie</TableHeaderCell>
                <TableHeaderCell>E-mail</TableHeaderCell>
                <TableHeaderCell>Telefoon</TableHeaderCell>
                <TableHeaderCell />
              </TableRow>
            </TableHeader>
            <TableBody>
              {company.contacts.length === 0 ? (
                <TableEmptyRow colSpan={5}>
                  Nog geen contacten bij dit bedrijf.
                </TableEmptyRow>
              ) : (
                company.contacts.map((contact) => {
                  const fullName = [contact.firstName, contact.lastName]
                    .filter(Boolean)
                    .join(" ");
                  return (
                    <TableRow key={contact.id}>
                      <TableCell>
                        <span className="font-medium">{fullName}</span>
                        {contact.isPrimary ? (
                          <span className="ml-2 text-xs text-fg-muted">
                            Primair
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-fg-muted">
                        {contact.jobTitle || "—"}
                      </TableCell>
                      <TableCell className="text-fg-muted">
                        {contact.email || "—"}
                      </TableCell>
                      <TableCell className="text-fg-muted">
                        {contact.phone || "—"}
                      </TableCell>
                      <TableCell align="right">
                        <EditContactDialog
                          companyId={company.id}
                          contact={{
                            id: contact.id,
                            firstName: contact.firstName,
                            lastName: contact.lastName,
                            jobTitle: contact.jobTitle,
                            email: contact.email,
                            phone: contact.phone,
                            notes: contact.notes,
                            isPrimary: contact.isPrimary,
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </section>
    </div>
  );
}
