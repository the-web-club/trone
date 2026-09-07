import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { ContactDetail } from "@/components/contact/contact-detail";
import { ContactLeadsTable } from "@/components/contact/contact-leads-table";
import {
  ContactTimeline,
  EntityTasks,
} from "@/components/detail/entity-activity";
import {
  DetailTaskSkeleton,
  DetailTimelineSkeleton,
} from "@/components/detail/detail-skeletons";
import { isAdminSession, requireSession } from "@/lib/auth-session";
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

  return (
    <ContactDetail
      contact={{
        id: contact.id,
        slug: contact.slug,
        firstName: contact.firstName,
        lastName: contact.lastName,
        jobTitle: contact.jobTitle,
        email: contact.email,
        phone: contact.phone,
        notes: contact.notes,
        isPrimary: contact.isPrimary,
        company: contact.company,
      }}
      isAdmin={isAdminSession(session)}
      leads={
        <ContactLeadsTable
          leads={contact.deals.map((deal) => ({
            id: deal.id,
            slug: deal.slug,
            title: deal.title,
            stage: deal.stage,
          }))}
        />
      }
      activity={
        <>
          <Suspense fallback={<DetailTimelineSkeleton compact />}>
            <ContactTimeline
              compact
              contactId={contact.id}
              companyId={companyId}
            />
          </Suspense>
          <Suspense fallback={<DetailTaskSkeleton compact />}>
            <EntityTasks
              compact
              currentUserId={session.user.id}
              contactId={contact.id}
              companyId={companyId}
            />
          </Suspense>
        </>
      }
    />
  );
}
