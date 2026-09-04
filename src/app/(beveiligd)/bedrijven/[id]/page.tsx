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
import { PageHeader } from "@/components/shell/page-header";
import { TaskSection } from "@/components/task/task-section";
import { Timeline } from "@/components/timeline/timeline";
import { WorkLogSection } from "@/components/worklog/work-log-section";
import { isAdminSession, requireSession } from "@/lib/auth-session";
import { getCompany } from "@/lib/company-service";
import { isAppError } from "@/lib/errors";
import { listActiveAssignees, listOpenTasksForEntity } from "@/lib/task-service";
import { listTimelineForCompany } from "@/lib/timeline-service";
import { listOrdersForWorkLog, listWorkLogs } from "@/lib/worklog-service";

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
  const session = await requireSession();
  const company = await getCompany(id).catch((error) => {
    if (isAppError(error) && error.status === 404) notFound();
    throw error;
  });
  const [logs, orders, events, tasks, assignees] = await Promise.all([
    listWorkLogs({ companyId: id }),
    listOrdersForWorkLog(undefined, id),
    listTimelineForCompany(id),
    listOpenTasksForEntity({ companyId: id }),
    listActiveAssignees(),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={company.name}
        description={
          <Link href="/bedrijven" className="hover:underline">
            Terug naar bedrijven
          </Link>
        }
      />

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
                        <Link
                          href={`/contacten/${contact.id}`}
                          className="font-medium text-fg hover:underline"
                        >
                          {fullName}
                        </Link>
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

      <TaskSection
        tasks={tasks}
        currentUserId={session.user.id}
        assignees={assignees}
        companyId={company.id}
      />

      <Timeline events={events} companyId={company.id} />

      <WorkLogSection
        title="Werkzaamheden"
        currentUserId={session.user.id}
        isAdmin={isAdminSession(session)}
        defaultCompanyId={company.id}
        lockCompany
        companies={[{ id: company.id, name: company.name }]}
        orders={orders.map((order) => ({
          id: order.id,
          orderNumber: order.orderNumber,
          companyId: order.companyId,
          companyName: company.name,
        }))}
        logs={logs}
      />
    </div>
  );
}
