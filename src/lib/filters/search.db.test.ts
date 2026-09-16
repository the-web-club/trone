/**
 * Het leadzoekveld zoekt op de lead zelf én op het gekoppelde bedrijf en
 * contact. Dat liep via LIKE over drie tabellen en loopt nu via het afgeleide
 * `deal.searchIndex`. Deze tests bewaken dat de semantiek daarbij gelijk is
 * gebleven, inclusief het oude relationele predicaat als referentie.
 *
 * Vereist een database (bench-dataset).
 */
import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const hasDatabase = Boolean(
  process.env.DATABASE_HOST &&
    process.env.DATABASE_NAME &&
    process.env.DATABASE_USER,
);

describe.runIf(hasDatabase)("leads zoeken", () => {
  let prisma: import("@/generated/prisma/client").PrismaClient;
  let Prisma: typeof import("@/generated/prisma/client").Prisma;
  let listDeals: typeof import("@/lib/deal-service").listDeals;
  let buildDealListWhere: typeof import("@/lib/deal-service").buildDealListWhere;

  beforeAll(async () => {
    ({ Prisma } = await import("@/generated/prisma/client"));
    prisma = (await import("@/lib/db")).getPrismaClient();
    ({ listDeals, buildDealListWhere } = await import("@/lib/deal-service"));
  }, 60_000);

  /** Het predicaat zoals het was vóór searchIndex. */
  async function legacyCount(term: string) {
    const like = `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    const rows = await prisma.$queryRaw<Array<{ n: bigint }>>(Prisma.sql`
      SELECT COUNT(*) AS n FROM deal d
       WHERE d.title LIKE ${like}
          OR EXISTS (SELECT 1 FROM company c WHERE c.id = d.companyId AND c.name LIKE ${like})
          OR EXISTS (SELECT 1 FROM contact ct WHERE ct.id = d.contactId
                      AND (ct.firstName LIKE ${like} OR ct.lastName LIKE ${like}))`);
    return Number(rows[0]?.n ?? 0);
  }

  const terms = [
    "Terras", // leadtitel
    "Lounge", // leadtitel
    "Holding", // bedrijfsnaam
    "Koninklijke", // bedrijfsnaam
    "Jansen", // contact-achternaam
    "Fatima", // contact-voornaam
    "jan", // substring midden in een woord (Jansen, Marjan)
    "BV", // komt in veel bedrijfsnamen voor
    "zzzgeenresultaat",
  ];

  it.each(terms)("'%s' geeft hetzelfde aantal als het oude predicaat", async (term) => {
    const legacy = await legacyCount(term);
    const current = (await listDeals({ zoeken: term, pageSize: 1 })).total;
    expect(current).toBe(legacy);
  }, 60_000);

  it("zoeken is case-insensitive, net als LIKE dat was", async () => {
    // Term uit de echte dataset halen; een vaste term bestaat niet in elke
    // database.
    const sample = await prisma.deal.findFirst({
      where: { title: { not: "" } },
      select: { title: true },
      orderBy: { createdAt: "desc" },
    });
    const word =
      sample?.title
        .split(/\s+/)
        .find((part) => /^[\p{L}]{4,}$/u.test(part)) ?? null;
    expect(word).toBeTruthy();

    const lower = (await listDeals({ zoeken: word!.toLowerCase(), pageSize: 1 }))
      .total;
    const upper = (await listDeals({ zoeken: word!.toUpperCase(), pageSize: 1 }))
      .total;
    expect(lower).toBeGreaterThan(0);
    expect(upper).toBe(lower);
  }, 60_000);

  /**
   * Of een specifieke lead op pagina 1 staat, hangt af van hoeveel andere
   * leads dezelfde term bevatten. Productnamen als "High Back" komen in
   * honderden titels voor. Deze helper controleert daarom of de lead het
   * zoekpredicaat matcht, los van paginering.
   */
  async function matchesSearch(dealId: string, term: string) {
    const count = await prisma.deal.count({
      where: { AND: [buildDealListWhere({ zoeken: term }), { id: dealId }] },
    });
    return count === 1;
  }

  it("vindt een lead via de naam van het gekoppelde bedrijf", async () => {
    const deal = await prisma.deal.findFirst({
      where: { companyId: { not: null } },
      select: { id: true, company: { select: { name: true } } },
    });
    const name = deal?.company?.name;
    expect(name).toBeTruthy();
    expect(await matchesSearch(deal!.id, name!)).toBe(true);
    expect((await listDeals({ zoeken: name!, pageSize: 1 })).total).toBeGreaterThan(0);
  }, 60_000);

  it("vindt een lead via de naam van het gekoppelde contact", async () => {
    const deal = await prisma.deal.findFirst({
      where: { contactId: { not: null } },
      select: {
        id: true,
        contact: { select: { firstName: true, lastName: true } },
      },
    });
    // De voor- en achternaam staan aaneengesloten in searchIndex.
    const term = [deal?.contact?.firstName, deal?.contact?.lastName]
      .filter(Boolean)
      .join(" ");
    expect(term).toBeTruthy();
    expect(await matchesSearch(deal!.id, term)).toBe(true);
  }, 60_000);

  it("leads zonder bedrijf blijven vindbaar op hun eigen titel", async () => {
    const deal = await prisma.deal.findFirst({
      where: { companyId: null },
      select: { id: true, title: true },
    });
    expect(deal).toBeTruthy();
    expect(await matchesSearch(deal!.id, deal!.title)).toBe(true);
  }, 60_000);

  it("elke lead is vindbaar op zijn eigen titel", async () => {
    // Sterkere variant: geen enkele rij mag door de afgeleide kolom
    // onvindbaar worden op zijn eigen titel.
    const rows = await prisma.$queryRaw<Array<{ n: bigint }>>(Prisma.sql`
      SELECT COUNT(*) AS n FROM deal d
       WHERE d.searchIndex IS NULL
          OR LOCATE(LOWER(d.title), d.searchIndex) = 0`);
    expect(Number(rows[0]?.n ?? 0)).toBe(0);
  }, 60_000);

  it("een wildcard in de zoekterm is letterlijk, geen joker", async () => {
    const all = (await listDeals({ pageSize: 1 })).total;
    const wildcard = (await listDeals({ zoeken: "%", pageSize: 1 })).total;
    expect(wildcard).toBeLessThan(all);
  }, 60_000);

  it("searchIndex is in sync met de brongegevens", async () => {
    const rows = await prisma.$queryRaw<Array<{ n: bigint }>>(Prisma.sql`
      SELECT COUNT(*) AS n
        FROM deal d
        LEFT JOIN company c ON c.id = d.companyId
        LEFT JOIN contact ct ON ct.id = d.contactId
       WHERE NOT (d.searchIndex <=> LOWER(CONCAT_WS(' ', d.title, c.name, ct.firstName, ct.lastName)))`);
    expect(Number(rows[0]?.n ?? 0)).toBe(0);
  }, 60_000);

  it("triggers houden searchIndex bij bij een naamswijziging van het bedrijf", async () => {
    const company = await prisma.company.findFirst({
      where: { deals: { some: {} } },
      select: { id: true, name: true },
    });
    expect(company).toBeTruthy();
    const unique = `Zoektest${Date.now()}`;
    try {
      await prisma.company.update({
        where: { id: company!.id },
        data: { name: unique },
      });
      const found = await listDeals({ zoeken: unique, pageSize: 25 });
      expect(found.total).toBeGreaterThan(0);
    } finally {
      await prisma.company.update({
        where: { id: company!.id },
        data: { name: company!.name },
      });
    }
    // Na terugdraaien mag de oude term niets meer opleveren.
    const after = await listDeals({ zoeken: unique, pageSize: 1 });
    expect(after.total).toBe(0);
  }, 60_000);
});
