/**
 * Driftbewaking tussen de twee implementaties van hetzelfde filtercontract:
 * de Prisma `where` (lijst) en het SQL-fragment (facet-aggregatie).
 *
 * Voor elke filtercombinatie moet `COUNT(*)` identiek zijn. Zonder deze test
 * kan een facet-telling stil gaan afwijken van de lijst.
 *
 * Vereist een echte database. Draai tegen de bench-dataset:
 *   pnpm vitest run src/lib/filters/sql-where.drift.test.ts
 * met DATABASE_* uit .env.bench.local. Zonder database slaat de suite over.
 */
import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const hasDatabase = Boolean(
  process.env.DATABASE_HOST &&
    process.env.DATABASE_NAME &&
    process.env.DATABASE_USER,
);

const CURRENT_USER = "bench-user-1";

describe.runIf(hasDatabase)("Prisma-where en SQL-where blijven gelijk", () => {
  let prisma: import("@/generated/prisma/client").PrismaClient;
  let Prisma: typeof import("@/generated/prisma/client").Prisma;
  let buildDealListWhere: typeof import("@/lib/deal-service").buildDealListWhere;
  let buildCompanyListWhere: typeof import("@/lib/company-service").buildCompanyListWhere;
  let listCompanyRows: typeof import("@/lib/company-service").listCompanyRows;
  let buildContactListWhere: typeof import("@/lib/contact-service").buildContactListWhere;
  let sql: typeof import("@/lib/filters/sql-where");

  beforeAll(async () => {
    ({ Prisma } = await import("@/generated/prisma/client"));
    prisma = (await import("@/lib/db")).getPrismaClient();
    ({ buildDealListWhere } = await import("@/lib/deal-service"));
    ({ buildCompanyListWhere, listCompanyRows } = await import(
      "@/lib/company-service"
    ));
    ({ buildContactListWhere } = await import("@/lib/contact-service"));
    sql = await import("@/lib/filters/sql-where");
  }, 60_000);

  async function sqlCount(table: string, alias: string, where: unknown) {
    const rows = await prisma.$queryRaw<Array<{ n: bigint | number }>>(
      Prisma.sql`SELECT COUNT(*) AS n FROM ${Prisma.raw(table)} ${Prisma.raw(alias)} WHERE ${where as never}`,
    );
    return Number(rows[0]?.n ?? 0);
  }

  const dealCases: Array<{ name: string; filters: Record<string, unknown> }> = [
    { name: "geen filters", filters: {} },
    { name: "zoeken op leadveld", filters: { zoeken: "Terras" } },
    { name: "zoeken matcht bedrijfsnaam", filters: { zoeken: "Holding" } },
    { name: "zoeken matcht contactnaam", filters: { zoeken: "Jansen" } },
    { name: "zoeken met wildcard-teken", filters: { zoeken: "50%" } },
    { name: "status open", filters: { status: "open" } },
    { name: "status won", filters: { status: "won" } },
    { name: "fase", filters: { stageId: "stage-offerte" } },
    { name: "bron", filters: { sourceId: "src-web" } },
    { name: "bron ontbreekt", filters: { sourceId: "geen" } },
    { name: "eigenaar aan-mij", filters: { eigenaar: "aan-mij" } },
    { name: "eigenaar niet-toegewezen", filters: { eigenaar: "niet-toegewezen" } },
    { name: "eigenaar specifiek", filters: { eigenaar: "bench-user-2" } },
    { name: "waardebereik", filters: { waardeMin: "1000", waardeMax: "5000" } },
    { name: "datumbereik aangemaakt", filters: { van: "2026-01-01", tot: "2026-12-31" } },
    {
      name: "datumbereik verwacht",
      filters: { van: "2026-01-01", tot: "2026-12-31", datumveld: "verwacht" },
    },
    { name: "leadscore hoog", filters: { leadscore: "hoog" } },
    { name: "leadscore niet-beoordeeld", filters: { leadscore: "niet-beoordeeld" } },
    { name: "leadscore onvolledig", filters: { leadscore: "onvolledig" } },
    { name: "leadscore geen-match", filters: { leadscore: "geen-match" } },
    { name: "branche enkel", filters: { industries: ["horeca"] } },
    { name: "branche meerdere (OR)", filters: { industries: ["horeca", "zorg"] } },
    { name: "branche onbekend", filters: { industries: ["onbekend"] } },
    { name: "lead zonder bedrijf", filters: { industries: ["geen-bedrijf"] } },
    {
      name: "lead zonder bedrijf of branche",
      filters: { industries: ["geen-bedrijf", "horeca"] },
    },
    { name: "sector", filters: { sectors: ["restaurant"] } },
    { name: "sector onbekend", filters: { sectors: ["onbekend"] } },
    { name: "branche EN sector", filters: { industries: ["horeca"], sectors: ["restaurant"] } },
    { name: "toepassing", filters: { applications: ["terras"] } },
    { name: "toepassing meerdere", filters: { applications: ["terras", "lounge"] } },
    { name: "toepassing onbekend", filters: { applications: ["onbekend"] } },
    {
      name: "branche EN sector EN toepassing",
      filters: {
        industries: ["horeca"],
        sectors: ["restaurant"],
        applications: ["terras"],
      },
    },
    {
      name: "alles gecombineerd",
      filters: {
        zoeken: "Terras",
        status: "open",
        stageId: "stage-nieuw",
        eigenaar: "bench-user-2",
        industries: ["horeca", "onbekend"],
        sectors: ["restaurant"],
        applications: ["terras"],
        waardeMin: "500",
      },
    },
  ];

  it.each(dealCases)("lead: $name", async ({ filters }) => {
    const prismaCount = await prisma.deal.count({
      where: buildDealListWhere(filters as never, CURRENT_USER),
    });
    const raw = await sqlCount(
      "deal",
      "d",
      sql.dealWhereSql(filters as never, CURRENT_USER),
    );
    expect(raw).toBe(prismaCount);
  }, 30_000);

  const companyCases: Array<{ name: string; filters: Record<string, unknown> }> = [
    { name: "geen filters", filters: {} },
    { name: "zoeken", filters: { query: "Holding" } },
    { name: "plaats", filters: { city: "Amsterdam" } },
    { name: "plaats onbekend", filters: { city: "onbekend" } },
    { name: "land", filters: { country: "NL" } },
    { name: "eigenaar aan-mij", filters: { eigenaar: "aan-mij" } },
    { name: "eigenaar niet-toegewezen", filters: { eigenaar: "niet-toegewezen" } },
    { name: "branche", filters: { industries: ["horeca"] } },
    { name: "branche onbekend", filters: { industries: ["onbekend"] } },
    { name: "sector onbekend", filters: { sectors: ["onbekend"] } },
    { name: "branche EN sector", filters: { industries: ["horeca"], sectors: ["restaurant"] } },
    { name: "toepassing", filters: { applications: ["terras"] } },
    { name: "toepassing onbekend", filters: { applications: ["onbekend"] } },
    { name: "leads geen", filters: { leads: "geen" } },
    { name: "leads 1", filters: { leads: "1" } },
    { name: "leads 3", filters: { leads: "3" } },
    { name: "leads 5plus", filters: { leads: "5plus" } },
    {
      name: "leads 5plus met branche",
      filters: { leads: "5plus", industries: ["horeca"] },
    },
    {
      name: "alles gecombineerd",
      filters: {
        query: "Holding",
        city: "Amsterdam",
        country: "NL",
        industries: ["horeca"],
        applications: ["terras"],
        leads: "5plus",
      },
    },
  ];

  // Het lijsttotaal is de autoriteit; de facet-SQL moet daar exact op uitkomen.
  it.each(companyCases)("bedrijf: $name", async ({ filters }) => {
    const listTotal = (
      await listCompanyRows({ ...filters, pageSize: 1 } as never, CURRENT_USER)
    ).total;
    const raw = await sqlCount(
      "company",
      "co",
      sql.andSql([
        sql.companyWhereSql(filters as never, CURRENT_USER),
        sql.companyLeadBucketSql(filters.leads as string | undefined),
      ]),
    );
    expect(raw).toBe(listTotal);
  }, 30_000);

  const contactCases: Array<{ name: string; filters: Record<string, unknown> }> = [
    { name: "geen filters", filters: {} },
    { name: "zoeken op voornaam", filters: { query: "Jan" } },
    { name: "zoeken op e-mail", filters: { query: "contact1" } },
    { name: "zoeken te kort", filters: { query: "ab" } },
    { name: "bedrijf", filters: { companyId: "bench-company-3" } },
    { name: "zonder bedrijf", filters: { companyId: "geen-bedrijf" } },
    { name: "eigenaar aan-mij", filters: { eigenaar: "aan-mij" } },
    { name: "eigenaar niet-toegewezen", filters: { eigenaar: "niet-toegewezen" } },
    { name: "branche", filters: { industries: ["horeca"] } },
    { name: "branche onbekend", filters: { industries: ["onbekend"] } },
    { name: "zonder bedrijf via branchefilter", filters: { industries: ["geen-bedrijf"] } },
    { name: "sector", filters: { sectors: ["restaurant"] } },
    { name: "sector onbekend", filters: { sectors: ["onbekend"] } },
    { name: "toepassing", filters: { applications: ["terras"] } },
    { name: "toepassing onbekend", filters: { applications: ["onbekend"] } },
    {
      name: "branche EN toepassing via dezelfde relatie",
      filters: { industries: ["horeca"], applications: ["terras"] },
    },
    {
      name: "branche EN sector EN toepassing",
      filters: {
        industries: ["horeca"],
        sectors: ["restaurant"],
        applications: ["terras"],
      },
    },
    {
      name: "alles gecombineerd",
      filters: {
        query: "Jan",
        eigenaar: "bench-user-2",
        industries: ["horeca"],
        sectors: ["restaurant"],
        applications: ["terras"],
      },
    },
  ];

  it.each(contactCases)("contact: $name", async ({ filters }) => {
    const prismaCount = await prisma.contact.count({
      where: buildContactListWhere(filters as never, CURRENT_USER),
    });
    const raw = await sqlCount(
      "contact",
      "ct",
      sql.contactWhereSql(filters as never, CURRENT_USER),
    );
    expect(raw).toBe(prismaCount);
  }, 30_000);

  it("buildCompanyListWhere blijft los bruikbaar zonder leads-bucket", async () => {
    const count = await prisma.company.count({
      where: buildCompanyListWhere({ city: "Amsterdam" }, CURRENT_USER),
    });
    const raw = await sqlCount(
      "company",
      "co",
      sql.companyWhereSql({ city: "Amsterdam" }, CURRENT_USER),
    );
    expect(raw).toBe(count);
  }, 30_000);
});
