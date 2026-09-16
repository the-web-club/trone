import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import {
  CLASSIFICATION_FILTER_UNKNOWN,
} from "@/lib/classification";
import { getPrismaClient } from "@/lib/db";
import {
  aggregateLinkedCompanyFacets,
  distinctCodesByEntity,
  mapGroupCounts,
} from "@/lib/filters/aggregate";
import type { FacetCountMap } from "@/lib/filters/types";

export type ClassificationFacetCounts = {
  industry: FacetCountMap;
  sector: FacetCountMap;
  application: FacetCountMap;
};

export async function dealClassificationFacetCounts(args: {
  industryWhere: Prisma.DealWhereInput;
  sectorWhere: Prisma.DealWhereInput;
  applicationWhere: Prisma.DealWhereInput;
}): Promise<ClassificationFacetCounts> {
  const prisma = getPrismaClient();
  const [industryGroups, sectorGroups, applicationGroups, unknownApplications] =
    await Promise.all([
      prisma.deal.groupBy({
        by: ["companyId"],
        where: args.industryWhere,
        _count: { _all: true },
      }),
      prisma.deal.groupBy({
        by: ["companyId"],
        where: args.sectorWhere,
        _count: { _all: true },
      }),
      prisma.dealApplication.groupBy({
        by: ["code"],
        where: { deal: args.applicationWhere },
        _count: { _all: true },
      }),
      prisma.deal.count({
        where: {
          AND: [args.applicationWhere, { applications: { none: {} } }],
        },
      }),
    ]);

  const [industryCompanies, sectorCompanies] = await Promise.all([
    companiesForGroups(industryGroups),
    companiesForGroups(sectorGroups),
  ]);

  const industry = aggregateLinkedCompanyFacets(
    industryGroups.map((group) => ({
      companyId: group.companyId,
      count: group._count._all,
    })),
    industryCompanies,
    { includeNoCompany: true },
  );
  const sector = aggregateLinkedCompanyFacets(
    sectorGroups.map((group) => ({
      companyId: group.companyId,
      count: group._count._all,
    })),
    sectorCompanies,
    { includeNoCompany: false },
  );
  const application = mapGroupCounts(applicationGroups, "code");
  application.set(CLASSIFICATION_FILTER_UNKNOWN, unknownApplications);

  return {
    industry: industry.industry,
    sector: sector.sector,
    application,
  };
}

export async function companyClassificationFacetCounts(args: {
  industryWhere: Prisma.CompanyWhereInput;
  sectorWhere: Prisma.CompanyWhereInput;
  applicationWhere: Prisma.CompanyWhereInput;
}): Promise<ClassificationFacetCounts> {
  const prisma = getPrismaClient();
  const [industryGroups, sectorGroups, companies, deals] = await Promise.all([
    prisma.company.groupBy({
      by: ["industryCode"],
      where: args.industryWhere,
      _count: { _all: true },
    }),
    prisma.company.groupBy({
      by: ["industryCode", "sectorCode"],
      where: args.sectorWhere,
      _count: { _all: true },
    }),
    prisma.company.findMany({
      where: args.applicationWhere,
      select: { id: true },
    }),
    prisma.deal.findMany({
      where: { companyId: { not: null }, company: args.applicationWhere },
      select: {
        companyId: true,
        applications: { select: { code: true } },
      },
    }),
  ]);
  const codesByCompany = new Map<string, string[]>();
  for (const company of companies) codesByCompany.set(company.id, []);
  for (const deal of deals) {
    if (!deal.companyId) continue;
    const codes = codesByCompany.get(deal.companyId);
    if (!codes) continue;
    for (const item of deal.applications) codes.push(item.code);
  }

  const industry = mapGroupCounts(
    industryGroups,
    "industryCode",
    CLASSIFICATION_FILTER_UNKNOWN,
  );
  const sector = new Map<string, number>();
  let unknownSector = 0;
  for (const group of sectorGroups) {
    const count = group._count._all;
    if (group.industryCode && !group.sectorCode) {
      unknownSector += count;
    } else if (group.sectorCode) {
      sector.set(group.sectorCode, (sector.get(group.sectorCode) ?? 0) + count);
    }
  }
  sector.set(CLASSIFICATION_FILTER_UNKNOWN, unknownSector);

  const application = distinctCodesByEntity(
    [...codesByCompany.entries()].map(([entityId, codes]) => ({
      entityId,
      codes,
    })),
  );

  return {
    industry,
    sector,
    application: application.byCode,
  };
}

export async function contactClassificationFacetCounts(args: {
  industryWhere: Prisma.ContactWhereInput;
  sectorWhere: Prisma.ContactWhereInput;
  applicationWhere: Prisma.ContactWhereInput;
}): Promise<ClassificationFacetCounts> {
  const prisma = getPrismaClient();
  const [industryGroups, sectorGroups, contacts] = await Promise.all([
    prisma.contact.groupBy({
      by: ["companyId"],
      where: args.industryWhere,
      _count: { _all: true },
    }),
    prisma.contact.groupBy({
      by: ["companyId"],
      where: args.sectorWhere,
      _count: { _all: true },
    }),
    prisma.contact.findMany({
      where: args.applicationWhere,
      select: {
        id: true,
        deals: { select: { applications: { select: { code: true } } } },
      },
    }),
  ]);

  const [industryCompanies, sectorCompanies] = await Promise.all([
    companiesForGroups(industryGroups),
    companiesForGroups(sectorGroups),
  ]);

  const industry = aggregateLinkedCompanyFacets(
    industryGroups.map((group) => ({
      companyId: group.companyId,
      count: group._count._all,
    })),
    industryCompanies,
    { includeNoCompany: true },
  );
  const sector = aggregateLinkedCompanyFacets(
    sectorGroups.map((group) => ({
      companyId: group.companyId,
      count: group._count._all,
    })),
    sectorCompanies,
    { includeNoCompany: false },
  );
  const application = distinctCodesByEntity(
    contacts.map((contact) => ({
      entityId: contact.id,
      codes: contact.deals.flatMap((deal) =>
        deal.applications.map((item) => item.code),
      ),
    })),
  );

  return {
    industry: industry.industry,
    sector: sector.sector,
    application: application.byCode,
  };
}

async function companiesForGroups(
  groups: Array<{ companyId: string | null }>,
) {
  const prisma = getPrismaClient();
  const ids = [
    ...new Set(
      groups.flatMap((group) => (group.companyId ? [group.companyId] : [])),
    ),
  ];
  if (ids.length === 0) return [];
  return prisma.company.findMany({
    where: { id: { in: ids } },
    select: { id: true, industryCode: true, sectorCode: true },
  });
}
