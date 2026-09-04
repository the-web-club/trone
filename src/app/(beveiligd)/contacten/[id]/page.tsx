import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { updateContactAction } from "@/app/(beveiligd)/actions/contact-actions";
import { ContactForm } from "@/components/contact/contact-form";
import { TaskSection } from "@/components/task/task-section";
import { Timeline } from "@/components/timeline/timeline";
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
import { isAppError } from "@/lib/errors";
import { formatPersonName } from "@/lib/format";
import { listActiveAssignees, listOpenTasksForEntity } from "@/lib/task-service";
import { listTimelineForContact } from "@/lib/timeline-service";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  try {
    const { id } = await params;
    const contact = await getContact(id);
    return { title: formatPersonName(contact.firstName, contact.lastName) };
  } catch {
    return { title: "Contact" };
  }
}

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSession();
  const contact = await getContact(id).catch((error) => {
    if (isAppError(error) && error.status === 404) notFound();
    throw error;
  });
  const [events, tasks, assignees] = await Promise.all([
    listTimelineForContact(contact.id),
    listOpenTasksForEntity({
      contactId: contact.id,
      companyId: contact.companyId ?? undefined,
    }),
    listActiveAssignees(),
  ]);
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
                <Link
                  href={`/bedrijven/${contact.company.id}`}
                  className="hover:underline"
                >
                  {contact.company.name}
                </Link>
              </>
            ) : null}
          </>
        }
        actions={
          contact.isPrimary ? <Badge tone="info">Primair</Badge> : undefined
        }
      />

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
                      <Link
                        href={`/leads/${deal.id}`}
                        className="font-medium text-fg hover:underline"
                      >
                        {deal.title}
                      </Link>
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

      <TaskSection
        tasks={tasks}
        currentUserId={session.user.id}
        assignees={assignees}
        contactId={contact.id}
        companyId={contact.companyId}
      />

      <Timeline
        events={events}
        contactId={contact.id}
        companyId={contact.companyId}
      />
    </div>
  );
}
