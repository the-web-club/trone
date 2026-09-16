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

function splitApplicationFilter(values: string[]) {
  return {
    codes: values.filter((value) => value !== CLASSIFICATION_FILTER_UNKNOWN),
    unknown: values.includes(CLASSIFICATION_FILTER_UNKNOWN),
  };
}

export function dealApplicationWhere(
  applications: string[],
): Prisma.DealWhereInput | undefined {
  if (applications.length === 0) return undefined;
  const { codes, unknown } = splitApplicationFilter(applications);
  const parts: Prisma.DealWhereInput[] = [];
  if (codes.length > 0) {
    parts.push({ applications: { some: { code: { in: codes } } } });
  }
  if (unknown) {
    parts.push({ applications: { none: {} } });
  }
  return orWhere(parts);
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

function companyApplicationWhere(
  applications: string[],
): Prisma.CompanyWhereInput | undefined {
  if (applications.length === 0) return undefined;
  const { codes, unknown } = splitApplicationFilter(applications);
  const parts: Prisma.CompanyWhereInput[] = [];
  if (codes.length > 0) {
    parts.push({
      deals: { some: { applications: { some: { code: { in: codes } } } } },
    });
  }
  if (unknown) {
    parts.push({ deals: { none: { applications: { some: {} } } } });
  }
  return orWhere(parts);
}

export function companyClassificationWhere(
  filter: ClassificationListFilter,
): Prisma.CompanyWhereInput | undefined {
  if (!hasClassificationListFilter(filter)) return undefined;
  return andWhere<Prisma.CompanyWhereInput>([
    companyIndustrySectorWhere(filter),
    companyApplicationWhere(filter.applications),
  ]);
}

function contactIndustrySectorWhere(
  filter: Pick<ClassificationListFilter, "industries" | "sectors">,
): Prisma.ContactWhereInput | undefined {
  const industries = splitIndustryFilter(filter.industries);
  const sectors = splitSectorFilter(filter.sectors);
  const industryParts: Prisma.ContactWhereInput[] = [];
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
  const sectorParts: Prisma.ContactWhereInput[] = [];
  if (sectors.codes.length > 0) {
    sectorParts.push({ company: { sectorCode: { in: sectors.codes } } });
  }
  if (sectors.unknown) {
    sectorParts.push({
      company: { industryCode: { not: null }, sectorCode: null },
    });
  }
  return andWhere<Prisma.ContactWhereInput>([
    orWhere(industryParts),
    orWhere(sectorParts),
  ]);
}

function contactApplicationWhere(
  applications: string[],
): Prisma.ContactWhereInput | undefined {
  if (applications.length === 0) return undefined;
  const { codes, unknown } = splitApplicationFilter(applications);
  const parts: Prisma.ContactWhereInput[] = [];
  if (codes.length > 0) {
    parts.push({
      deals: { some: { applications: { some: { code: { in: codes } } } } },
    });
  }
  if (unknown) {
    parts.push({ deals: { none: { applications: { some: {} } } } });
  }
  return orWhere(parts);
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

  const industrySectorWhere = contactIndustrySectorWhere(filter);
  const applicationWhere = dealApplicationWhere(filter.applications);
  const contactApps = contactApplicationWhere(filter.applications);
  const companyWhere = companyIndustrySectorWhere(filter);

  if (industrySectorWhere && applicationWhere && companyWhere) {
    return {
      AND: [
        industrySectorWhere,
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
  return andWhere<Prisma.ContactWhereInput>([
    industrySectorWhere,
    contactApps,
  ]);
}
