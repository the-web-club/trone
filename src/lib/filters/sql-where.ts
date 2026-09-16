/**
 * SQL-zijde van het filtercontract.
 *
 * Elke entiteit heeft één `where`-compiler die exact dezelfde semantiek
 * uitdrukt als de Prisma-variant in `deal-service`/`company-service`/
 * `contact-service`. De lijst blijft via Prisma lopen; deze fragmenten zijn
 * voor aggregatie (facet-tellingen), waar Prisma niet op een relatiekolom kan
 * groeperen en anders de halve tabel naar Node zou trekken.
 *
 * Twee implementaties van dezelfde semantiek is een driftrisico. Daarom
 * vergelijkt `src/lib/filters/sql-where.drift.test.ts` beide varianten op een
 * matrix van filtercombinaties tegen dezelfde database.
 *
 * Alles is geparameteriseerd via `Prisma.sql`. Nooit `$queryRawUnsafe`.
 */
import { Prisma } from "@/generated/prisma/client";
import {
  CLASSIFICATION_FILTER_NO_COMPANY,
  CLASSIFICATION_FILTER_UNKNOWN,
} from "@/lib/classification";
import {
  endExclusiveOfCalendarDate,
  normalizeDateOnlyInput,
  parseAmountInput,
  startOfCalendarDate,
} from "@/lib/date-input";
import {
  LEAD_SCORE_CATEGORY_BOUNDS,
  LEAD_SCORE_QUESTION_COUNT,
  type LeadScoreFilter,
} from "@/lib/lead-score";
import { effectiveSearchQuery, escapeLikeTerm } from "@/lib/list-query";

const TRUE = Prisma.sql`1 = 1`;

/** AND van losse fragmenten; leeg = altijd waar. */
export function andSql(parts: Array<Prisma.Sql | undefined>): Prisma.Sql {
  const present = parts.filter((part): part is Prisma.Sql => part != null);
  if (present.length === 0) return TRUE;
  return Prisma.sql`(${Prisma.join(present, " AND ")})`;
}

function orSql(parts: Prisma.Sql[]): Prisma.Sql | undefined {
  if (parts.length === 0) return undefined;
  return Prisma.sql`(${Prisma.join(parts, " OR ")})`;
}

/** `contains` in Prisma wordt LIKE '%term%'; dit is hetzelfde patroon. */
export function likeContains(term: string): string {
  return `%${escapeLikeTerm(term)}%`;
}

function splitIndustry(values: readonly string[]) {
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

function splitCode(values: readonly string[]) {
  return {
    codes: values.filter((value) => value !== CLASSIFICATION_FILTER_UNKNOWN),
    unknown: values.includes(CLASSIFICATION_FILTER_UNKNOWN),
  };
}

function inList(column: Prisma.Sql, codes: readonly string[]): Prisma.Sql {
  return Prisma.sql`${column} IN (${Prisma.join(codes.map((code) => Prisma.sql`${code}`), ",")})`;
}

// ---------------------------------------------------------------------------
// Bedrijf: industry/sector-predicaat op een company-alias
// ---------------------------------------------------------------------------

/** Mirror van `companyIndustrySectorWhere`, toegepast op `alias`. */
function companyIndustrySectorSql(
  alias: Prisma.Sql,
  industries: readonly string[],
  sectors: readonly string[],
): Prisma.Sql | undefined {
  const industry = splitIndustry(industries);
  const sector = splitCode(sectors);

  const industryParts: Prisma.Sql[] = [];
  if (industry.codes.length > 0) {
    industryParts.push(inList(Prisma.sql`${alias}.industryCode`, industry.codes));
  }
  if (industry.unknown) {
    industryParts.push(Prisma.sql`${alias}.industryCode IS NULL`);
  }

  const sectorParts: Prisma.Sql[] = [];
  if (sector.codes.length > 0) {
    sectorParts.push(inList(Prisma.sql`${alias}.sectorCode`, sector.codes));
  }
  if (sector.unknown) {
    sectorParts.push(
      Prisma.sql`(${alias}.industryCode IS NOT NULL AND ${alias}.sectorCode IS NULL)`,
    );
  }

  const parts = [orSql(industryParts), orSql(sectorParts)].filter(
    (part): part is Prisma.Sql => part != null,
  );
  if (parts.length === 0) return undefined;
  return andSql(parts);
}

// ---------------------------------------------------------------------------
// Lead (deal)
// ---------------------------------------------------------------------------

export type DealSqlFilters = {
  zoeken?: string;
  stageId?: string;
  sourceId?: string;
  eigenaar?: string;
  status?: "alle" | "open" | "won" | "lost";
  waardeMin?: string | number | null;
  waardeMax?: string | number | null;
  van?: string;
  tot?: string;
  datumveld?: "aangemaakt" | "verwacht";
  leadscore?: LeadScoreFilter | "";
  industries?: string[];
  sectors?: string[];
  applications?: string[];
};

function ownerSql(
  column: Prisma.Sql,
  eigenaar: string | undefined,
  currentUserId: string | undefined,
): Prisma.Sql | undefined {
  const value = eigenaar?.trim() || "alle";
  if (value === "aan-mij") {
    return Prisma.sql`${column} = ${currentUserId ?? "__no_match__"}`;
  }
  if (value === "niet-toegewezen") return Prisma.sql`${column} IS NULL`;
  if (value !== "alle") return Prisma.sql`${column} = ${value}`;
  return undefined;
}

function leadScoreSql(filter: LeadScoreFilter): Prisma.Sql {
  switch (filter) {
    case "hoog":
      return Prisma.sql`(d.leadScoreNoMatch = false AND d.leadScore >= ${LEAD_SCORE_CATEGORY_BOUNDS.high.min} AND d.leadScore <= ${LEAD_SCORE_CATEGORY_BOUNDS.high.max})`;
    case "middel":
      return Prisma.sql`(d.leadScoreNoMatch = false AND d.leadScore >= ${LEAD_SCORE_CATEGORY_BOUNDS.medium.min} AND d.leadScore <= ${LEAD_SCORE_CATEGORY_BOUNDS.medium.max})`;
    case "laag":
      return Prisma.sql`(d.leadScoreNoMatch = false AND d.leadScore >= ${LEAD_SCORE_CATEGORY_BOUNDS.low.min} AND d.leadScore <= ${LEAD_SCORE_CATEGORY_BOUNDS.low.max})`;
    case "niet-beoordeeld":
      return Prisma.sql`d.leadScore IS NULL`;
    case "onvolledig":
      return Prisma.sql`(d.leadScoreAssessed >= 1 AND d.leadScoreAssessed <= ${LEAD_SCORE_QUESTION_COUNT - 1})`;
    case "geen-match":
      return Prisma.sql`d.leadScoreNoMatch = true`;
  }
}

/** Mirror van `dealApplicationWhere` op alias `d`. */
function dealApplicationSql(
  applications: readonly string[],
): Prisma.Sql | undefined {
  if (applications.length === 0) return undefined;
  const { codes, unknown } = splitCode(applications);
  const parts: Prisma.Sql[] = [];
  if (codes.length > 0) {
    parts.push(
      Prisma.sql`EXISTS (SELECT 1 FROM deal_application da WHERE da.dealId = d.id AND ${inList(Prisma.sql`da.code`, codes)})`,
    );
  }
  if (unknown) {
    parts.push(
      Prisma.sql`NOT EXISTS (SELECT 1 FROM deal_application da WHERE da.dealId = d.id)`,
    );
  }
  return orSql(parts);
}

/** Mirror van `dealClassificationWhere` op alias `d`. */
function dealClassificationSql(
  industries: readonly string[],
  sectors: readonly string[],
  applications: readonly string[],
): Prisma.Sql | undefined {
  if (
    industries.length === 0 &&
    sectors.length === 0 &&
    applications.length === 0
  ) {
    return undefined;
  }

  const industry = splitIndustry(industries);
  const sector = splitCode(sectors);

  const industryParts: Prisma.Sql[] = [];
  if (industry.noCompany) industryParts.push(Prisma.sql`d.companyId IS NULL`);
  if (industry.unknown) {
    industryParts.push(
      Prisma.sql`(d.companyId IS NOT NULL AND EXISTS (SELECT 1 FROM company c WHERE c.id = d.companyId AND c.industryCode IS NULL))`,
    );
  }
  if (industry.codes.length > 0) {
    industryParts.push(
      Prisma.sql`EXISTS (SELECT 1 FROM company c WHERE c.id = d.companyId AND ${inList(Prisma.sql`c.industryCode`, industry.codes)})`,
    );
  }

  const sectorParts: Prisma.Sql[] = [];
  if (sector.codes.length > 0) {
    sectorParts.push(
      Prisma.sql`EXISTS (SELECT 1 FROM company c WHERE c.id = d.companyId AND ${inList(Prisma.sql`c.sectorCode`, sector.codes)})`,
    );
  }
  if (sector.unknown) {
    sectorParts.push(
      Prisma.sql`EXISTS (SELECT 1 FROM company c WHERE c.id = d.companyId AND c.industryCode IS NOT NULL AND c.sectorCode IS NULL)`,
    );
  }

  return andSql([
    orSql(industryParts),
    orSql(sectorParts),
    dealApplicationSql(applications),
  ]);
}

/** Mirror van `buildDealListWhere`. Alias voor deal is altijd `d`. */
export function dealWhereSql(
  filters: DealSqlFilters,
  currentUserId?: string,
): Prisma.Sql {
  const parts: Array<Prisma.Sql | undefined> = [];

  parts.push(ownerSql(Prisma.sql`d.ownerUserId`, filters.eigenaar, currentUserId));

  const search = filters.zoeken?.trim();
  if (search) {
    // Zie buildDealListWhere: hetzelfde afgeleide zoekveld, zodat lijst en
    // facet-tellingen op exact hetzelfde predicaat werken.
    parts.push(
      Prisma.sql`d.searchIndex LIKE ${likeContains(search.toLowerCase())}`,
    );
  }

  if (filters.stageId) parts.push(Prisma.sql`d.stageId = ${filters.stageId}`);

  if (filters.sourceId === "geen") {
    parts.push(Prisma.sql`d.sourceId IS NULL`);
  } else if (filters.sourceId) {
    parts.push(Prisma.sql`d.sourceId = ${filters.sourceId}`);
  }

  if (filters.status === "open") parts.push(Prisma.sql`d.status = 'OPEN'`);
  else if (filters.status === "won") parts.push(Prisma.sql`d.status = 'WON'`);
  else if (filters.status === "lost") parts.push(Prisma.sql`d.status = 'LOST'`);

  const min =
    typeof filters.waardeMin === "number"
      ? filters.waardeMin
      : parseAmountInput(filters.waardeMin);
  const max =
    typeof filters.waardeMax === "number"
      ? filters.waardeMax
      : parseAmountInput(filters.waardeMax);
  if (min != null) parts.push(Prisma.sql`d.valueEstimate >= ${min}`);
  if (max != null) parts.push(Prisma.sql`d.valueEstimate <= ${max}`);

  const van = normalizeDateOnlyInput(filters.van);
  const tot = normalizeDateOnlyInput(filters.tot);
  if (van || tot) {
    const column =
      filters.datumveld === "verwacht"
        ? Prisma.sql`d.expectedClose`
        : Prisma.sql`d.createdAt`;
    if (van) {
      parts.push(Prisma.sql`${column} >= ${startOfCalendarDate(van)}`);
    }
    if (tot) {
      parts.push(Prisma.sql`${column} < ${endExclusiveOfCalendarDate(tot)}`);
    }
  }

  if (filters.leadscore) parts.push(leadScoreSql(filters.leadscore));

  parts.push(
    dealClassificationSql(
      filters.industries ?? [],
      filters.sectors ?? [],
      filters.applications ?? [],
    ),
  );

  return andSql(parts);
}

// ---------------------------------------------------------------------------
// Bedrijf (company)
// ---------------------------------------------------------------------------

export type CompanySqlFilters = {
  query?: string;
  city?: string;
  country?: string;
  eigenaar?: string;
  leads?: string;
  industries?: string[];
  sectors?: string[];
  applications?: string[];
};

/** Mirror van `companyApplicationWhere` op alias `co`. */
function companyApplicationSql(
  applications: readonly string[],
): Prisma.Sql | undefined {
  if (applications.length === 0) return undefined;
  const { codes, unknown } = splitCode(applications);
  const parts: Prisma.Sql[] = [];
  if (codes.length > 0) {
    parts.push(
      Prisma.sql`EXISTS (
        SELECT 1 FROM deal d
          JOIN deal_application da ON da.dealId = d.id
         WHERE d.companyId = co.id AND ${inList(Prisma.sql`da.code`, codes)})`,
    );
  }
  if (unknown) {
    parts.push(
      Prisma.sql`NOT EXISTS (
        SELECT 1 FROM deal d
          JOIN deal_application da ON da.dealId = d.id
         WHERE d.companyId = co.id)`,
    );
  }
  return orSql(parts);
}

/**
 * Mirror van `buildCompanyListWhere` (alias `co`).
 * De `leads`-bucket zit niet hierin: die is een HAVING op een aggregaat en
 * komt in `companyLeadBucketSql`.
 */
export function companyWhereSql(
  filters: CompanySqlFilters,
  currentUserId?: string,
): Prisma.Sql {
  const parts: Array<Prisma.Sql | undefined> = [];

  parts.push(ownerSql(Prisma.sql`co.ownerUserId`, filters.eigenaar, currentUserId));

  const query = filters.query?.trim();
  if (query) parts.push(Prisma.sql`co.name LIKE ${likeContains(query)}`);

  const city = filters.city?.trim();
  if (city === CLASSIFICATION_FILTER_UNKNOWN) {
    parts.push(Prisma.sql`co.city IS NULL`);
  } else if (city) {
    parts.push(Prisma.sql`co.city = ${city}`);
  }

  const country = filters.country?.trim();
  if (country) parts.push(Prisma.sql`co.country = ${country}`);

  parts.push(
    companyIndustrySectorSql(
      Prisma.sql`co`,
      filters.industries ?? [],
      filters.sectors ?? [],
    ),
  );
  parts.push(companyApplicationSql(filters.applications ?? []));

  return andSql(parts);
}

/**
 * Lead-aantal bucket als predicaat, zonder de id's naar Node te halen.
 * `geen` = geen enkele lead; `1..4` = exact; `5plus` = 5 of meer.
 */
export function companyLeadBucketSql(leads: string | undefined): Prisma.Sql | undefined {
  const value = leads?.trim() || "alle";
  if (value === "alle") return undefined;
  const countExpr = Prisma.sql`(SELECT COUNT(*) FROM deal d WHERE d.companyId = co.id)`;
  if (value === "geen") return Prisma.sql`${countExpr} = 0`;
  if (value === "5plus") return Prisma.sql`${countExpr} >= 5`;
  const exact = Number(value);
  if (!Number.isInteger(exact) || exact < 1 || exact > 4) return undefined;
  return Prisma.sql`${countExpr} = ${exact}`;
}

// ---------------------------------------------------------------------------
// Contact
// ---------------------------------------------------------------------------

export type ContactSqlFilters = {
  query?: string;
  companyId?: string;
  eigenaar?: string;
  industries?: string[];
  sectors?: string[];
  applications?: string[];
};

/** Mirror van `contactApplicationWhere` op alias `ct`. */
function contactApplicationSql(
  applications: readonly string[],
): Prisma.Sql | undefined {
  if (applications.length === 0) return undefined;
  const { codes, unknown } = splitCode(applications);
  const parts: Prisma.Sql[] = [];
  if (codes.length > 0) {
    parts.push(
      Prisma.sql`EXISTS (
        SELECT 1 FROM deal d
          JOIN deal_application da ON da.dealId = d.id
         WHERE d.contactId = ct.id AND ${inList(Prisma.sql`da.code`, codes)})`,
    );
  }
  if (unknown) {
    parts.push(
      Prisma.sql`NOT EXISTS (
        SELECT 1 FROM deal d
          JOIN deal_application da ON da.dealId = d.id
         WHERE d.contactId = ct.id)`,
    );
  }
  return orSql(parts);
}

/** Mirror van `contactIndustrySectorWhere` op alias `ct`. */
function contactIndustrySectorSql(
  industries: readonly string[],
  sectors: readonly string[],
): Prisma.Sql | undefined {
  const industry = splitIndustry(industries);
  const sector = splitCode(sectors);

  const industryParts: Prisma.Sql[] = [];
  if (industry.noCompany) industryParts.push(Prisma.sql`ct.companyId IS NULL`);
  if (industry.unknown) {
    industryParts.push(
      Prisma.sql`(ct.companyId IS NOT NULL AND EXISTS (SELECT 1 FROM company c WHERE c.id = ct.companyId AND c.industryCode IS NULL))`,
    );
  }
  if (industry.codes.length > 0) {
    industryParts.push(
      Prisma.sql`EXISTS (SELECT 1 FROM company c WHERE c.id = ct.companyId AND ${inList(Prisma.sql`c.industryCode`, industry.codes)})`,
    );
  }

  const sectorParts: Prisma.Sql[] = [];
  if (sector.codes.length > 0) {
    sectorParts.push(
      Prisma.sql`EXISTS (SELECT 1 FROM company c WHERE c.id = ct.companyId AND ${inList(Prisma.sql`c.sectorCode`, sector.codes)})`,
    );
  }
  if (sector.unknown) {
    sectorParts.push(
      Prisma.sql`EXISTS (SELECT 1 FROM company c WHERE c.id = ct.companyId AND c.industryCode IS NOT NULL AND c.sectorCode IS NULL)`,
    );
  }

  return andSql([orSql(industryParts), orSql(sectorParts)]);
}

/**
 * Mirror van `contactClassificationWhere`, inclusief de gecombineerde tak:
 * staan branche/sector én toepassing aan, dan moeten ze via dezelfde lead
 * én hetzelfde bedrijf matchen. Anders zou een contact kunnen matchen op
 * branche via bedrijf A en op toepassing via een lead bij bedrijf B.
 */
function contactClassificationSql(
  industries: readonly string[],
  sectors: readonly string[],
  applications: readonly string[],
): Prisma.Sql | undefined {
  if (
    industries.length === 0 &&
    sectors.length === 0 &&
    applications.length === 0
  ) {
    return undefined;
  }

  const industrySector = contactIndustrySectorSql(industries, sectors);
  const companyPredicate = companyIndustrySectorSql(
    Prisma.sql`c`,
    industries,
    sectors,
  );
  const { codes, unknown } = splitCode(applications);
  const hasApplicationFilter = applications.length > 0;

  if (industrySector && hasApplicationFilter && companyPredicate) {
    const appParts: Prisma.Sql[] = [];
    if (codes.length > 0) {
      appParts.push(
        Prisma.sql`EXISTS (SELECT 1 FROM deal_application da WHERE da.dealId = d.id AND ${inList(Prisma.sql`da.code`, codes)})`,
      );
    }
    if (unknown) {
      appParts.push(
        Prisma.sql`NOT EXISTS (SELECT 1 FROM deal_application da WHERE da.dealId = d.id)`,
      );
    }
    const appPredicate = orSql(appParts) ?? TRUE;
    return andSql([
      industrySector,
      Prisma.sql`EXISTS (
        SELECT 1 FROM deal d
         WHERE d.contactId = ct.id
           AND EXISTS (SELECT 1 FROM company c WHERE c.id = d.companyId AND ${companyPredicate})
           AND ${appPredicate})`,
    ]);
  }

  return andSql([industrySector, contactApplicationSql(applications)]);
}

/** Mirror van `buildContactListWhere` (alias `ct`). */
export function contactWhereSql(
  filters: ContactSqlFilters,
  currentUserId?: string,
): Prisma.Sql {
  const parts: Array<Prisma.Sql | undefined> = [];

  const query = effectiveSearchQuery(filters.query);
  if (query) {
    const like = likeContains(query);
    parts.push(
      Prisma.sql`(ct.firstName LIKE ${like} OR ct.lastName LIKE ${like} OR ct.email LIKE ${like})`,
    );
  }

  if (filters.companyId === CLASSIFICATION_FILTER_NO_COMPANY) {
    parts.push(Prisma.sql`ct.companyId IS NULL`);
  } else if (filters.companyId) {
    parts.push(Prisma.sql`ct.companyId = ${filters.companyId}`);
  }

  parts.push(ownerSql(Prisma.sql`ct.ownerUserId`, filters.eigenaar, currentUserId));

  parts.push(
    contactClassificationSql(
      filters.industries ?? [],
      filters.sectors ?? [],
      filters.applications ?? [],
    ),
  );

  return andSql(parts);
}
