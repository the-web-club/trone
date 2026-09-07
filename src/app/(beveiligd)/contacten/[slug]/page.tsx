import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { updateContactAction } from "@/app/(beveiligd)/actions/contact-actions";
import { ContactForm } from "@/components/contact/contact-form";
import {
  ContactTimeline,
  EntityTasks,
} from "@/components/detail/entity-activity";
import {
  DetailTaskSkeleton,
  DetailTimelineSkeleton,
} from "@/components/detail/detail-skeletons";
import { CompanyLink, DealLink } from "@/components/entity-links";
import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
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
import { requireSession } from "@/lib/auth-session";
import { getContact } from "@/lib/contact-service";
import { getContactCompanyId } from "@/lib/contact-company";
import { contactPath } from "@/lib/paths";
import { isAppError } from "@/lib/errors";
import { formatPersonName } from "@/lib/format";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  try {
    const { slug } = await params;
    const contact = await getContact(slug);
    return { title: formatPersonName(contact.firstName, contact.lastName) };
  } catch {
    return { title: "Contact" };
  }
}

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [session, contact] = await Promise.all([
    requireSession(),
    getContact(slug).catch((error) => {
      if (isAppError(error) && error.status === 404) notFound();
      throw error;
    }),
  ]);
  if (slug !== contact.slug) redirect(contactPath(contact));
  const companyId = getContactCompanyId(contact);
  const name = formatPersonName(contact.firstName, contact.lastName);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={name}
        description={
          <>
            <Link href="/contacten" className="hover:underline">
              Terug naar contacten
            </Link>
            {contact.company ? (
              <>
                {" · "}
                <CompanyLink company={contact.company} />
              </>
            ) : null}
          </>
        }
        actions={
          contact.isPrimary ? <Badge tone="info">Primair</Badge> : undefined
        }
      />

      <section className="flex flex-col gap-4">
        <h2 className="text-md font-medium text-fg">Bedrijf</h2>
        {contact.company ? (
          <p className="text-sm text-fg">
            <CompanyLink company={contact.company} primary />
          </p>
        ) : (
          <p className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg-muted">
            Dit contact is niet aan een bedrijf gekoppeld.
          </p>
        )}
      </section>

      {contact.companyId ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-md font-medium text-fg">Gegevens</h2>
          <ContactForm
            action={updateContactAction}
            submitLabel="Wijzigingen opslaan"
            contact={{
              id: contact.id,
              companyId: contact.companyId,
              firstName: contact.firstName,
              lastName: contact.lastName,
              jobTitle: contact.jobTitle,
              email: contact.email,
              phone: contact.phone,
              notes: contact.notes,
              isPrimary: contact.isPrimary,
            }}
          />
        </section>
      ) : null}

      <section className="flex flex-col gap-4">
        <h2 className="text-md font-medium text-fg">Leads</h2>
        <TableContainer>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHeaderCell>Lead</TableHeaderCell>
                <TableHeaderCell>Fase</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contact.deals.length === 0 ? (
                <TableEmptyRow colSpan={2}>
                  Nog geen leads bij dit contact.
                </TableEmptyRow>
              ) : (
                contact.deals.map((deal) => (
                  <TableRow key={deal.id}>
                    <TableCell>
                      <DealLink deal={deal} primary />
                    </TableCell>
                    <TableCell className="text-fg-muted">
                      {deal.stage.name}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </section>

      <Suspense fallback={<DetailTaskSkeleton />}>
        <EntityTasks
          currentUserId={session.user.id}
          contactId={contact.id}
          companyId={companyId}
        />
      </Suspense>

      <Suspense fallback={<DetailTimelineSkeleton />}>
        <ContactTimeline contactId={contact.id} companyId={companyId} />
      </Suspense>
    </div>
  );
}
