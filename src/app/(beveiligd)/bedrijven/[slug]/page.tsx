import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { CompanyDetail } from "@/components/company/company-detail";
import { CompanyLeadsTable } from "@/components/company/company-leads-table";
import { CompanyTimeline } from "@/components/detail/entity-activity";
import { DetailTimelineSkeleton } from "@/components/detail/detail-skeletons";
import {
  isAdminSession,
  isViewerSession,
  requireSession,
} from "@/lib/auth-session";
import { getCompany } from "@/lib/company-service";
import { uniqueApplicationCodes } from "@/lib/classification";
import { listDealTeamMembers } from "@/lib/deal-service";
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
  const [session, company, members] = await Promise.all([
    requireSession(),
    getCompany(slug).catch((error) => {
      if (isAppError(error) && error.status === 404) notFound();
      throw error;
    }),
    listDealTeamMembers(),
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
        ownerUserId: company.ownerUserId,
        industryCode: company.industryCode,
        sectorCode: company.sectorCode,
        relationTypes: company.relationTypes.map((item) => item.code),
        applicationsFromDeals: uniqueApplicationCodes(company.deals),
      }}
      members={members}
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
      canEdit={!isViewerSession(session)}
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
        </>
      }
    />
  );
}
