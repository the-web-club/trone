import "server-only";

import { Prisma } from "@/generated/prisma/client";
import {
  CLASSIFICATION_FILTER_NO_COMPANY,
  CLASSIFICATION_FILTER_UNKNOWN,
} from "@/lib/classification";
import { getPrismaClient } from "@/lib/db";
import {
  LEAD_SCORE_CATEGORY_BOUNDS,
  LEAD_SCORE_QUESTION_COUNT,
  type LeadScoreFilter,
} from "@/lib/lead-score";
import type { FacetCountMap } from "@/lib/filters/types";

/**
 * Facet-tellingen als pure SQL-aggregatie.
 *
 * Waarom niet Prisma: `groupBy` kan niet op een kolom van een relatie
 * groeperen. De vorige implementatie groepeerde daarom op `companyId`
 * (O(bedrijven) groepen), haalde die id's naar Node en deed er een tweede
 * query met `IN (…duizenden id's…)` op. Voor contacten haalde hij zelfs de
 * hele tabel met geneste leads en toepassingen op om in JS te tellen.
 * Dat is lineair in de datasetgrootte per filteractie.
 *
 * Hier doet de database de aggregatie en komen er alleen tientallen
 * groepsrijen terug, onafhankelijk van de datasetgrootte.
 */

type CountRow = { value: string | null; n: bigint | number };

function toCount(value: bigint | number | null): number {
  if (value == null) return 0;
  return typeof value === "bigint" ? Number(value) : Number(value);
}

function toMap(rows: CountRow[], nullKey?: string): FacetCountMap {
  const map = new Map<string, number>();
  for (const row of rows) {
    const count = toCount(row.n);
    if (row.value == null) {
      if (nullKey) map.set(nullKey, (map.get(nullKey) ?? 0) + count);
      continue;
    }
    map.set(row.value, (map.get(row.value) ?? 0) + count);
  }
  return map;
}

// ---------------------------------------------------------------------------
// Lead (deal)
// ---------------------------------------------------------------------------

export type DealFacetSqlResult = {
  stage: FacetCountMap;
  stageTotal: number;
  source: FacetCountMap;
  sourceTotal: number;
  unassignedSource: number;
  owner: FacetCountMap;
  ownerTotal: number;
  unassignedOwner: number;
  status: FacetCountMap;
  statusTotal: number;
  score: Record<LeadScoreFilter, number>;
  scoreTotal: number;
  industry: FacetCountMap;
  sector: FacetCountMap;
  application: FacetCountMap;
};

export type DealFacetWheres = {
  stage: Prisma.Sql;
  source: Prisma.Sql;
  owner: Prisma.Sql;
  status: Prisma.Sql;
  score: Prisma.Sql;
  industry: Prisma.Sql;
  sector: Prisma.Sql;
  application: Prisma.Sql;
};

export async function dealFacetCountsSql(
  wheres: DealFacetWheres,
): Promise<DealFacetSqlResult> {
  const prisma = getPrismaClient();

  const [
    stageRows,
    sourceRows,
    ownerRows,
    statusRows,
    scoreRows,
    industryRows,
    sectorRows,
    applicationRows,
  ] = await Promise.all([
    prisma.$queryRaw<CountRow[]>(
      Prisma.sql`SELECT d.stageId AS value, COUNT(*) AS n FROM deal d WHERE ${wheres.stage} GROUP BY d.stageId`,
    ),
    prisma.$queryRaw<CountRow[]>(
      Prisma.sql`SELECT d.sourceId AS value, COUNT(*) AS n FROM deal d WHERE ${wheres.source} GROUP BY d.sourceId`,
    ),
    prisma.$queryRaw<CountRow[]>(
      Prisma.sql`SELECT d.ownerUserId AS value, COUNT(*) AS n FROM deal d WHERE ${wheres.owner} GROUP BY d.ownerUserId`,
    ),
    prisma.$queryRaw<CountRow[]>(
      Prisma.sql`SELECT d.status AS value, COUNT(*) AS n FROM deal d WHERE ${wheres.status} GROUP BY d.status`,
    ),
    // Alle zes scorebuckets in één scan, i.p.v. groupBy + JS-matching.
    prisma.$queryRaw<
      Array<Record<string, bigint | number>>
    >(Prisma.sql`
      SELECT
        COUNT(*) AS total,
        SUM(d.leadScoreNoMatch = false AND d.leadScore >= ${LEAD_SCORE_CATEGORY_BOUNDS.high.min} AND d.leadScore <= ${LEAD_SCORE_CATEGORY_BOUNDS.high.max}) AS hoog,
        SUM(d.leadScoreNoMatch = false AND d.leadScore >= ${LEAD_SCORE_CATEGORY_BOUNDS.medium.min} AND d.leadScore <= ${LEAD_SCORE_CATEGORY_BOUNDS.medium.max}) AS middel,
        SUM(d.leadScoreNoMatch = false AND d.leadScore >= ${LEAD_SCORE_CATEGORY_BOUNDS.low.min} AND d.leadScore <= ${LEAD_SCORE_CATEGORY_BOUNDS.low.max}) AS laag,
        SUM(d.leadScore IS NULL) AS nietBeoordeeld,
        SUM(d.leadScoreAssessed >= 1 AND d.leadScoreAssessed <= ${LEAD_SCORE_QUESTION_COUNT - 1}) AS onvolledig,
        SUM(d.leadScoreNoMatch = true) AS geenMatch
      FROM deal d WHERE ${wheres.score}`),
    // Branche van het gekoppelde bedrijf: aggregatie in de database.
    prisma.$queryRaw<CountRow[]>(Prisma.sql`
      SELECT CASE
               WHEN d.companyId IS NULL THEN ${CLASSIFICATION_FILTER_NO_COMPANY}
               WHEN c.industryCode IS NULL THEN ${CLASSIFICATION_FILTER_UNKNOWN}
               ELSE c.industryCode
             END AS value,
             COUNT(*) AS n
        FROM deal d LEFT JOIN company c ON c.id = d.companyId
       WHERE ${wheres.industry}
       GROUP BY value`),
    prisma.$queryRaw<CountRow[]>(Prisma.sql`
      SELECT CASE
               WHEN c.industryCode IS NOT NULL AND c.sectorCode IS NULL THEN ${CLASSIFICATION_FILTER_UNKNOWN}
               ELSE c.sectorCode
             END AS value,
             COUNT(*) AS n
        FROM deal d LEFT JOIN company c ON c.id = d.companyId
       WHERE ${wheres.sector}
       GROUP BY value`),
    // Uniek per (dealId, code) door de PK, dus COUNT(*) telt unieke leads.
    prisma.$queryRaw<CountRow[]>(Prisma.sql`
      SELECT da.code AS value, COUNT(*) AS n
        FROM deal d JOIN deal_application da ON da.dealId = d.id
       WHERE ${wheres.application}
       GROUP BY da.code
      UNION ALL
      SELECT ${CLASSIFICATION_FILTER_UNKNOWN} AS value, COUNT(*) AS n
        FROM deal d
       WHERE ${wheres.application}
         AND NOT EXISTS (SELECT 1 FROM deal_application da WHERE da.dealId = d.id)`),
  ]);

  const sum = (rows: CountRow[]) =>
    rows.reduce((total, row) => total + toCount(row.n), 0);

  const scoreRow = scoreRows[0] ?? {};
  const score: Record<LeadScoreFilter, number> = {
    hoog: toCount(scoreRow.hoog ?? 0),
    middel: toCount(scoreRow.middel ?? 0),
    laag: toCount(scoreRow.laag ?? 0),
    "niet-beoordeeld": toCount(scoreRow.nietBeoordeeld ?? 0),
    onvolledig: toCount(scoreRow.onvolledig ?? 0),
    "geen-match": toCount(scoreRow.geenMatch ?? 0),
  };

  const sectorMap = toMap(sectorRows);
  // Leads zonder bedrijf en bedrijven zonder branche hebben geen sector-groep;
  // die rijen komen als NULL terug en horen niet in de sectortelling.
  sectorMap.delete("null");

  return {
    stage: toMap(stageRows),
    stageTotal: sum(stageRows),
    source: toMap(sourceRows, "geen"),
    sourceTotal: sum(sourceRows),
    unassignedSource: toCount(
      sourceRows.find((row) => row.value == null)?.n ?? 0,
    ),
    owner: toMap(ownerRows),
    ownerTotal: sum(ownerRows),
    unassignedOwner: toCount(ownerRows.find((row) => row.value == null)?.n ?? 0),
    status: toMap(statusRows),
    statusTotal: sum(statusRows),
    score,
    scoreTotal: toCount(scoreRow.total ?? 0),
    industry: toMap(industryRows),
    sector: sectorMap,
    application: toMap(applicationRows),
  };
}

// ---------------------------------------------------------------------------
// Bedrijf (company)
// ---------------------------------------------------------------------------

export type CompanyFacetWheres = {
  city: Prisma.Sql;
  country: Prisma.Sql;
  owner: Prisma.Sql;
  leads: Prisma.Sql;
  industry: Prisma.Sql;
  sector: Prisma.Sql;
  application: Prisma.Sql;
};

export type CompanyFacetSqlResult = {
  city: FacetCountMap;
  cityTotal: number;
  unassignedCity: number;
  country: FacetCountMap;
  countryTotal: number;
  owner: FacetCountMap;
  ownerTotal: number;
  unassignedOwner: number;
  leadsTotal: number;
  leadsNone: number;
  leadsByBucket: Record<"1" | "2" | "3" | "4" | "5plus", number>;
  industry: FacetCountMap;
  sector: FacetCountMap;
  application: FacetCountMap;
};

export async function companyFacetCountsSql(
  wheres: CompanyFacetWheres,
): Promise<CompanyFacetSqlResult> {
  const prisma = getPrismaClient();

  const [
    cityRows,
    countryRows,
    ownerRows,
    leadRows,
    industryRows,
    sectorRows,
    applicationRows,
  ] = await Promise.all([
    prisma.$queryRaw<CountRow[]>(
      Prisma.sql`SELECT co.city AS value, COUNT(*) AS n FROM company co WHERE ${wheres.city} GROUP BY co.city`,
    ),
    prisma.$queryRaw<CountRow[]>(
      Prisma.sql`SELECT co.country AS value, COUNT(*) AS n FROM company co WHERE ${wheres.country} GROUP BY co.country`,
    ),
    prisma.$queryRaw<CountRow[]>(
      Prisma.sql`SELECT co.ownerUserId AS value, COUNT(*) AS n FROM company co WHERE ${wheres.owner} GROUP BY co.ownerUserId`,
    ),
    // Bucket-tellingen zonder de id's naar Node te halen.
    prisma.$queryRaw<CountRow[]>(Prisma.sql`
      SELECT bucket AS value, COUNT(*) AS n FROM (
        SELECT CASE
                 WHEN leadCount = 0 THEN 'geen'
                 WHEN leadCount >= 5 THEN '5plus'
                 ELSE CAST(leadCount AS CHAR)
               END AS bucket
          FROM (
            SELECT (SELECT COUNT(*) FROM deal d WHERE d.companyId = co.id) AS leadCount
              FROM company co WHERE ${wheres.leads}
          ) counted
      ) bucketed
      GROUP BY bucket`),
    prisma.$queryRaw<CountRow[]>(Prisma.sql`
      SELECT COALESCE(co.industryCode, ${CLASSIFICATION_FILTER_UNKNOWN}) AS value, COUNT(*) AS n
        FROM company co WHERE ${wheres.industry} GROUP BY value`),
    prisma.$queryRaw<CountRow[]>(Prisma.sql`
      SELECT CASE
               WHEN co.industryCode IS NOT NULL AND co.sectorCode IS NULL THEN ${CLASSIFICATION_FILTER_UNKNOWN}
               ELSE co.sectorCode
             END AS value,
             COUNT(*) AS n
        FROM company co WHERE ${wheres.sector} GROUP BY value`),
    prisma.$queryRaw<CountRow[]>(Prisma.sql`
      SELECT da.code AS value, COUNT(DISTINCT co.id) AS n
        FROM company co
        JOIN deal d ON d.companyId = co.id
        JOIN deal_application da ON da.dealId = d.id
       WHERE ${wheres.application}
       GROUP BY da.code
      UNION ALL
      SELECT ${CLASSIFICATION_FILTER_UNKNOWN} AS value, COUNT(*) AS n
        FROM company co
       WHERE ${wheres.application}
         AND NOT EXISTS (
           SELECT 1 FROM deal d JOIN deal_application da ON da.dealId = d.id
            WHERE d.companyId = co.id)`),
  ]);

  const sum = (rows: CountRow[]) =>
    rows.reduce((total, row) => total + toCount(row.n), 0);

  const leadMap = toMap(leadRows);
  const sectorMap = toMap(sectorRows);
  sectorMap.delete("null");

  return {
    city: toMap(cityRows),
    cityTotal: sum(cityRows),
    unassignedCity: toCount(cityRows.find((row) => row.value == null)?.n ?? 0),
    country: toMap(countryRows),
    countryTotal: sum(countryRows),
    owner: toMap(ownerRows),
    ownerTotal: sum(ownerRows),
    unassignedOwner: toCount(ownerRows.find((row) => row.value == null)?.n ?? 0),
    leadsTotal: sum(leadRows),
    leadsNone: leadMap.get("geen") ?? 0,
    leadsByBucket: {
      "1": leadMap.get("1") ?? 0,
      "2": leadMap.get("2") ?? 0,
      "3": leadMap.get("3") ?? 0,
      "4": leadMap.get("4") ?? 0,
      "5plus": leadMap.get("5plus") ?? 0,
    },
    industry: toMap(industryRows),
    sector: sectorMap,
    application: toMap(applicationRows),
  };
}

// ---------------------------------------------------------------------------
// Contact
// ---------------------------------------------------------------------------

export type ContactFacetWheres = {
  company: Prisma.Sql;
  owner: Prisma.Sql;
  industry: Prisma.Sql;
  sector: Prisma.Sql;
  application: Prisma.Sql;
};

export type ContactFacetSqlResult = {
  /** Naam komt uit dezelfde query, zodat de dropdown geen tweede bron nodig heeft. */
  company: Array<{ value: string; label: string; count: number }>;
  companyTotal: number;
  unassignedCompany: number;
  owner: FacetCountMap;
  ownerTotal: number;
  unassignedOwner: number;
  industry: FacetCountMap;
  sector: FacetCountMap;
  application: FacetCountMap;
};

/**
 * `companyLimit` begrenst de bedrijf-facet. Alleen bedrijven die daadwerkelijk
 * contacten hebben zijn zinvolle filteropties; de grootste groepen eerst.
 * Eerder kwamen hier alle bedrijven langs, ook die met nul contacten.
 *
 * 200 houdt de dropdown bruikbaar en de payload klein. Bij 500 was deze facet
 * 312 ms / 37 KB, bij 200 ongeveer 150 ms / 15 KB. Een bedrijf buiten de top
 * 200 is nog steeds filterbaar via de bedrijfsdetailpagina of de URL; het
 * actieve filter houdt altijd zijn label.
 */
export async function contactFacetCountsSql(
  wheres: ContactFacetWheres,
  companyLimit = 200,
): Promise<ContactFacetSqlResult> {
  const prisma = getPrismaClient();

  const [
    companyRows,
    companyTotals,
    ownerRows,
    industryRows,
    sectorRows,
    applicationRows,
  ] = await Promise.all([
    prisma.$queryRaw<Array<{ value: string; label: string | null; n: bigint | number }>>(
      Prisma.sql`
      SELECT ct.companyId AS value, c.name AS label, COUNT(*) AS n
        FROM contact ct JOIN company c ON c.id = ct.companyId
       WHERE ${wheres.company}
       GROUP BY ct.companyId, c.name
       ORDER BY n DESC, c.name ASC
       LIMIT ${companyLimit}`,
    ),
    prisma.$queryRaw<Array<{ total: bigint | number; unassigned: bigint | number }>>(
      Prisma.sql`
        SELECT COUNT(*) AS total, SUM(ct.companyId IS NULL) AS unassigned
          FROM contact ct WHERE ${wheres.company}`,
    ),
    prisma.$queryRaw<CountRow[]>(
      Prisma.sql`SELECT ct.ownerUserId AS value, COUNT(*) AS n FROM contact ct WHERE ${wheres.owner} GROUP BY ct.ownerUserId`,
    ),
    prisma.$queryRaw<CountRow[]>(Prisma.sql`
      SELECT CASE
               WHEN ct.companyId IS NULL THEN ${CLASSIFICATION_FILTER_NO_COMPANY}
               WHEN c.industryCode IS NULL THEN ${CLASSIFICATION_FILTER_UNKNOWN}
               ELSE c.industryCode
             END AS value,
             COUNT(*) AS n
        FROM contact ct LEFT JOIN company c ON c.id = ct.companyId
       WHERE ${wheres.industry}
       GROUP BY value`),
    prisma.$queryRaw<CountRow[]>(Prisma.sql`
      SELECT CASE
               WHEN c.industryCode IS NOT NULL AND c.sectorCode IS NULL THEN ${CLASSIFICATION_FILTER_UNKNOWN}
               ELSE c.sectorCode
             END AS value,
             COUNT(*) AS n
        FROM contact ct LEFT JOIN company c ON c.id = ct.companyId
       WHERE ${wheres.sector}
       GROUP BY value`),
    prisma.$queryRaw<CountRow[]>(Prisma.sql`
      SELECT da.code AS value, COUNT(DISTINCT ct.id) AS n
        FROM contact ct
        JOIN deal d ON d.contactId = ct.id
        JOIN deal_application da ON da.dealId = d.id
       WHERE ${wheres.application}
       GROUP BY da.code
      UNION ALL
      SELECT ${CLASSIFICATION_FILTER_UNKNOWN} AS value, COUNT(*) AS n
        FROM contact ct
       WHERE ${wheres.application}
         AND NOT EXISTS (
           SELECT 1 FROM deal d JOIN deal_application da ON da.dealId = d.id
            WHERE d.contactId = ct.id)`),
  ]);

  const sum = (rows: CountRow[]) =>
    rows.reduce((total, row) => total + toCount(row.n), 0);

  const sectorMap = toMap(sectorRows);
  sectorMap.delete("null");

  const totals = companyTotals[0];

  return {
    company: companyRows.map((row) => ({
      value: row.value,
      label: row.label ?? row.value,
      count: toCount(row.n),
    })),
    companyTotal: toCount(totals?.total ?? 0),
    unassignedCompany: toCount(totals?.unassigned ?? 0),
    owner: toMap(ownerRows),
    ownerTotal: sum(ownerRows),
    unassignedOwner: toCount(ownerRows.find((row) => row.value == null)?.n ?? 0),
    industry: toMap(industryRows),
    sector: sectorMap,
    application: toMap(applicationRows),
  };
}
