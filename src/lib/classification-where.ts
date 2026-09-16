import type { Prisma } from "@/generated/prisma/client";
import {
  CLASSIFICATION_FILTER_NO_COMPANY,
  CLASSIFICATION_FILTER_UNKNOWN,
  type ClassificationListFilter,
  hasClassificationListFilter,
} from "@/lib/classification";

function splitIndustryFilter(values: string[]) {
  return {
    codes: values.filter(
      (value) =>
        value !== CLASSIFICATION_FILTER_NO_COMPANY &&
        value !== CLASSIFICATION_FILTER_UNKNOWN,
    ),
    noCompany: values.includes(CLASSIFICATION_FILTER_NO_COMPANY),
    unknown: values.includes(CLASSIFICATION_FILTER_UNKNOWN),
  };
}

function splitSectorFilter(values: string[]) {
  return {
    codes: values.filter((value) => value !== CLASSIFICATION_FILTER_UNKNOWN),
    unknown: values.includes(CLASSIFICATION_FILTER_UNKNOWN),
  };
}

function orWhere<T>(parts: T[]): T | undefined {
  if (parts.length === 0) return undefined;
  if (parts.length === 1) return parts[0];
  return { OR: parts } as T;
}

function andWhere<T>(parts: Array<T | undefined>): T | undefined {
  const present = parts.filter((part): part is T => part != null);
  if (present.length === 0) return undefined;
  if (present.length === 1) return present[0];
  return { AND: present } as T;
}

export function companyIndustrySectorWhere(
  filter: Pick<ClassificationListFilter, "industries" | "sectors">,
): Prisma.CompanyWhereInput | undefined {
  const industries = splitIndustryFilter(filter.industries);
  const sectors = splitSectorFilter(filter.sectors);
  const industryParts: Prisma.CompanyWhereInput[] = [];
  if (industries.codes.length > 0) {
    industryParts.push({ industryCode: { in: industries.codes } });
  }
  if (industries.unknown) {
    industryParts.push({ industryCode: null });
  }
  const sectorParts: Prisma.CompanyWhereInput[] = [];
  if (sectors.codes.length > 0) {
    sectorParts.push({ sectorCode: { in: sectors.codes } });
  }
  if (sectors.unknown) {
    sectorParts.push({ industryCode: { not: null }, sectorCode: null });
  }

  return andWhere<Prisma.CompanyWhereInput>([
    orWhere(industryParts),
    orWhere(sectorParts),
  ]);
}

export function dealApplicationWhere(
  applications: string[],
): Prisma.DealWhereInput | undefined {
  if (applications.length === 0) return undefined;
  return {
    applications: { some: { code: { in: applications } } },
  };
}

export function dealClassificationWhere(
  filter: ClassificationListFilter,
): Prisma.DealWhereInput | undefined {
  if (!hasClassificationListFilter(filter)) return undefined;

  const industries = splitIndustryFilter(filter.industries);
  const sectors = splitSectorFilter(filter.sectors);
  const industryParts: Prisma.DealWhereInput[] = [];
  if (industries.noCompany) {
    industryParts.push({ companyId: null });
  }
  if (industries.unknown) {
    industryParts.push({
      companyId: { not: null },
      company: { industryCode: null },
    });
  }
  if (industries.codes.length > 0) {
    industryParts.push({
      company: { industryCode: { in: industries.codes } },
    });
  }

  const sectorParts: Prisma.DealWhereInput[] = [];
  if (sectors.codes.length > 0) {
    sectorParts.push({ company: { sectorCode: { in: sectors.codes } } });
  }
  if (sectors.unknown) {
    sectorParts.push({
      company: { industryCode: { not: null }, sectorCode: null },
    });
  }

  return andWhere<Prisma.DealWhereInput>([
    orWhere(industryParts),
    orWhere(sectorParts),
    dealApplicationWhere(filter.applications),
  ]);
}

export function companyClassificationWhere(
  filter: ClassificationListFilter,
): Prisma.CompanyWhereInput | undefined {
  if (!hasClassificationListFilter(filter)) return undefined;
  return andWhere<Prisma.CompanyWhereInput>([
    companyIndustrySectorWhere(filter),
    filter.applications.length
      ? { deals: { some: dealApplicationWhere(filter.applications) } }
      : undefined,
  ]);
}

/**
 * Branche/sector en toepassing moeten via dezelfde bedrijfsrelatie lopen.
 * Contact.companyId is de huidige 1:1-koppeling; toepassingen komen uit
 * aanvragen die expliciet aan het contact én datzelfde bedrijf hangen.
 */
export function contactClassificationWhere(
  filter: ClassificationListFilter,
): Prisma.ContactWhereInput | undefined {
  if (!hasClassificationListFilter(filter)) return undefined;

  const companyWhere = companyIndustrySectorWhere(filter);
  const applicationWhere = dealApplicationWhere(filter.applications);

  if (companyWhere && applicationWhere) {
    return {
      AND: [
        { company: companyWhere },
        {
          deals: {
            some: {
              AND: [{ company: companyWhere }, applicationWhere],
            },
          },
        },
      ],
    };
  }
  if (companyWhere) return { company: companyWhere };
  if (applicationWhere) return { deals: { some: applicationWhere } };
  return undefined;
}
