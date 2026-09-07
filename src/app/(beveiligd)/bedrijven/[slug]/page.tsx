import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { CompanyDetail } from "@/components/company/company-detail";
import { CompanyLeadsTable } from "@/components/company/company-leads-table";
import {
  CompanyTimeline,
  CompanyWorkLogs,
  EntityTasks,
} from "@/components/detail/entity-activity";
import {
  DetailTaskSkeleton,
  DetailTimelineSkeleton,
  DetailWorkLogSkeleton,
} from "@/components/detail/detail-skeletons";
import { isAdminSession, requireSession } from "@/lib/auth-session";
import { getCompany } from "@/lib/company-service";
import { isAppError } from "@/lib/errors";
import { companyPath } from "@/lib/paths";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  try {
    const { slug } = await params;
    const company = await getCompany(slug);
    return { title: company.name };
  } catch {
    return { title: "Bedrijf" };
  }
}

export default async function BedrijfDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [session, company] = await Promise.all([
    requireSession(),
    getCompany(slug).catch((error) => {
      if (isAppError(error) && error.status === 404) notFound();
      throw error;
    }),
  ]);
  if (slug !== company.slug) redirect(companyPath(company));

  return (
    <CompanyDetail
      company={{
        id: company.id,
        slug: company.slug,
        name: company.name,
        email: company.email,
        phone: company.phone,
        vatNumber: company.vatNumber,
        cocNumber: company.cocNumber,
        website: company.website,
        addressLine: company.addressLine,
        postalCode: company.postalCode,
        city: company.city,
        country: company.country,
        vatRate: Number(company.vatRate),
        viesValid: company.viesValid,
        viesValidatedAt: company.viesValidatedAt
          ? company.viesValidatedAt.toISOString()
          : null,
        viesCheckedName: company.viesCheckedName,
        notes: company.notes,
      }}
      contacts={company.contacts.map((contact) => ({
        id: contact.id,
        slug: contact.slug,
        firstName: contact.firstName,
        lastName: contact.lastName,
        jobTitle: contact.jobTitle,
        email: contact.email,
        phone: contact.phone,
        isPrimary: contact.isPrimary,
      }))}
      isAdmin={isAdminSession(session)}
      leads={
        <CompanyLeadsTable
          leads={company.deals.map((deal) => ({
            id: deal.id,
            slug: deal.slug,
            title: deal.title,
            contact: deal.contact,
            stage: deal.stage,
          }))}
        />
      }
      activity={
        <>
          <Suspense fallback={<DetailTimelineSkeleton compact />}>
            <CompanyTimeline compact companyId={company.id} />
          </Suspense>
          <Suspense fallback={<DetailTaskSkeleton compact />}>
            <EntityTasks
              compact
              currentUserId={session.user.id}
              companyId={company.id}
            />
          </Suspense>
          <Suspense fallback={<DetailWorkLogSkeleton compact />}>
            <CompanyWorkLogs
              compact
              companyId={company.id}
              companyName={company.name}
              currentUserId={session.user.id}
              isAdmin={isAdminSession(session)}
            />
          </Suspense>
        </>
      }
    />
  );
}
