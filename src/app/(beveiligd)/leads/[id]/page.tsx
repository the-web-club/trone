import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { updateDealAction } from "@/app/(beveiligd)/actions/deal-actions";
import { DealActivityForm } from "@/components/deal/deal-activity-form";
import { DealForm } from "@/components/deal/deal-form";
import { Badge } from "@/components/ui/badge";
import { listCompanies } from "@/lib/company-service";
import { listContacts } from "@/lib/contact-service";
import { getDeal, listDealStages, listLeadSources } from "@/lib/deal-service";
import { activityTypeLabels } from "@/lib/deal-validation";
import { isAppError } from "@/lib/errors";
import { formatDateTime, formatPersonName } from "@/lib/format";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  try {
    const { id } = await params;
    const deal = await getDeal(id);
    return { title: deal.title };
  } catch {
    return { title: "Lead" };
  }
}

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const deal = await getDeal(id).catch((error) => {
    if (isAppError(error) && error.status === 404) notFound();
    throw error;
  });

  const [stages, sources, companies, contacts] = await Promise.all([
    listDealStages(),
    listLeadSources(),
    listCompanies(),
    listContacts(),
  ]);
  const contactName = deal.contact
    ? formatPersonName(deal.contact.firstName, deal.contact.lastName)
    : null;

  return (
    <div className="flex flex-col gap-8">
      <header className="page-header">
        <div className="page-header-copy">
          <h1 className="page-header-title">{deal.title}</h1>
          <p className="page-header-description">
            <Link href="/leads" className="hover:underline">
              Terug naar de pijplijn
            </Link>
            {deal.company ? (
              <>
                {" · "}
                <Link
                  href={`/bedrijven/${deal.company.id}`}
                  className="hover:underline"
                >
                  {deal.company.name}
                </Link>
              </>
            ) : null}
            {contactName ? <>{" · "}{contactName}</> : null}
          </p>
        </div>
        <Badge
          tone={
            deal.stage.isWon ? "success" : deal.stage.isLost ? "danger" : "info"
          }
        >
          {deal.stage.name}
        </Badge>
      </header>

      <section className="flex flex-col gap-4">
        <h2 className="text-md font-medium text-fg">Gegevens</h2>
        <DealForm
          action={updateDealAction}
          submitLabel="Wijzigingen opslaan"
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
          deal={{
            id: deal.id,
            title: deal.title,
            companyId: deal.companyId,
            contactId: deal.contactId,
            stageId: deal.stageId,
            sourceId: deal.sourceId,
            valueEstimate:
              deal.valueEstimate == null ? null : Number(deal.valueEstimate),
          }}
        />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-md font-medium text-fg">Activiteiten</h2>
        <DealActivityForm dealId={deal.id} />
        <ul className="flex flex-col gap-2">
          {deal.activities.length === 0 ? (
            <li className="text-sm text-fg-muted">Nog geen activiteiten.</li>
          ) : (
            deal.activities.map((activity) => (
              <li
                key={activity.id}
                className="rounded-md border border-border bg-surface px-3 py-2"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    tone={
                      activity.type === "STAGE_CHANGE" ? "info" : "default"
                    }
                  >
                    {activityTypeLabels[activity.type]}
                  </Badge>
                  <span className="text-xs text-fg-muted">
                    {formatDateTime(activity.occurredAt)}
                  </span>
                </div>
                {activity.body ? (
                  <p className="mt-1 text-sm text-fg">{activity.body}</p>
                ) : null}
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
