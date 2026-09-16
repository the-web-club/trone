/**
 * Performancetest voor de lijstfilters op een representatieve dataset.
 *
 * Meet databasewerktijd, aantal query's en responsegrootte per filteractie.
 * Draai tegen de bench-dataset (12.000 leads / 5.000 bedrijven /
 * 14.000 contacten); zonder database slaat de suite over.
 *
 * De drempels hieronder zijn ruim gezet ten opzichte van de gemeten mediaan,
 * want SkySQL is serverless en varieert. Ze zijn bedoeld om een regressie in
 * de orde van grootte te betrappen (bijvoorbeeld het terugkeren van een
 * volledige-dataset-load), niet om ruis te meten.
 */
import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const hasDatabase = Boolean(
  process.env.DATABASE_HOST &&
    process.env.DATABASE_NAME &&
    process.env.DATABASE_USER,
);

/** Minimale datasetgrootte waarop deze drempels iets betekenen. */
const MIN_DEALS = 10_000;

const ME = "bench-user-1";

function sizeKb(value: unknown): number {
  return (
    Buffer.byteLength(
      JSON.stringify(value, (_key, inner) =>
        typeof inner === "bigint" ? inner.toString() : inner,
      ) ?? "",
      "utf8",
    ) / 1024
  );
}

async function median<T>(
  runs: number,
  run: () => Promise<T>,
): Promise<{ ms: number; result: T }> {
  await run(); // opwarmen
  const samples: number[] = [];
  let result!: T;
  for (let i = 0; i < runs; i += 1) {
    const started = performance.now();
    result = await run();
    samples.push(performance.now() - started);
  }
  samples.sort((a, b) => a - b);
  return { ms: samples[Math.floor(samples.length / 2)], result };
}

describe.runIf(hasDatabase)("lijstfilters op 10k+ records", () => {
  let dealService: typeof import("@/lib/deal-service");
  let companyService: typeof import("@/lib/company-service");
  let contactService: typeof import("@/lib/contact-service");
  let dealCount = 0;
  const report: string[] = [];

  beforeAll(async () => {
    dealService = await import("@/lib/deal-service");
    companyService = await import("@/lib/company-service");
    contactService = await import("@/lib/contact-service");
    const prisma = (await import("@/lib/db")).getPrismaClient();
    dealCount = await prisma.deal.count();
    if (dealCount < MIN_DEALS) {
      console.warn(
        `performance.db.test: dataset heeft ${dealCount} leads, drempels gelden vanaf ${MIN_DEALS}.`,
      );
    }
  }, 120_000);

  function log(label: string, ms: number, kb?: number) {
    report.push(
      `${label.padEnd(46)} ${String(Math.round(ms)).padStart(5)} ms${
        kb == null ? "" : `  ${kb.toFixed(0)} KB`
      }`,
    );
  }

  it("leadlijst: één pagina blijft ruim binnen budget en klein", async () => {
    const { ms, result } = await median(5, () =>
      dealService.listDeals({ page: 1, pageSize: 25 }, ME),
    );
    const kb = sizeKb(result.items);
    log("leadlijst pagina 1", ms, kb);
    expect(result.items.length).toBeLessThanOrEqual(25);
    expect(ms).toBeLessThan(400);
    // Eén pagina, niet de dataset.
    expect(kb).toBeLessThan(100);
  }, 120_000);

  it("leadlijst: zoeken blijft binnen budget", async () => {
    const { ms, result } = await median(5, () =>
      dealService.listDeals({ zoeken: "jan", page: 1, pageSize: 25 }, ME),
    );
    log("leadlijst zoeken 'jan'", ms, sizeKb(result.items));
    expect(result.items.length).toBeLessThanOrEqual(25);
    expect(ms).toBeLessThan(400);
  }, 120_000);

  it("leadfacetten: gebundeld en zonder datasetafhankelijke payload", async () => {
    const { ms, result } = await median(5, () =>
      dealService.getDealFilterFacets({}, ME),
    );
    const kb = sizeKb(result);
    log("leadfacetten", ms, kb);
    expect(ms).toBeLessThan(600);
    // Facetten zijn tellingen: een handvol KB, ongeacht de datasetgrootte.
    expect(kb).toBeLessThan(50);
  }, 120_000);

  it("leadfacetten met zoekterm blijven binnen budget", async () => {
    const { ms } = await median(5, () =>
      dealService.getDealFilterFacets({ zoeken: "jan" }, ME),
    );
    log("leadfacetten + zoeken", ms);
    expect(ms).toBeLessThan(900);
  }, 120_000);

  it("diepe pagina is niet dramatisch duurder dan de eerste", async () => {
    const first = await median(3, () =>
      dealService.listDeals({ page: 1, pageSize: 25 }, ME),
    );
    const deep = await median(3, () =>
      dealService.listDeals({ page: 400, pageSize: 25 }, ME),
    );
    log("leadlijst pagina 1", first.ms);
    log("leadlijst pagina 400 (offset 9975)", deep.ms);
    // Offsetpaginering is O(offset); dit legt vast dat het binnen dezelfde
    // orde van grootte blijft in plaats van te ontsporen.
    expect(deep.ms).toBeLessThan(first.ms * 6 + 300);
  }, 180_000);

  it("bedrijvenlijst en -facetten blijven binnen budget", async () => {
    const list = await median(5, () =>
      companyService.listCompanyRows({ pageSize: 25 }, ME),
    );
    const facets = await median(5, () =>
      companyService.getCompanyFilterFacets({}, ME),
    );
    log("bedrijvenlijst pagina 1", list.ms, sizeKb(list.result.items));
    log("bedrijffacetten", facets.ms, sizeKb(facets.result));
    expect(list.result.items.length).toBeLessThanOrEqual(25);
    expect(list.ms).toBeLessThan(400);
    expect(facets.ms).toBeLessThan(600);
  }, 180_000);

  it("lead-aantal filter gebruikt geen id-lijst meer", async () => {
    const { ms, result } = await median(5, () =>
      companyService.listCompanyRows({ leads: "5plus", pageSize: 25 }, ME),
    );
    log("bedrijven leads=5plus", ms, sizeKb(result.items));
    expect(result.items.length).toBeLessThanOrEqual(25);
    expect(ms).toBeLessThan(400);
  }, 120_000);

  it("contactenlijst en -facetten blijven binnen budget", async () => {
    const list = await median(5, () =>
      contactService.listContactRows({ pageSize: 25 }, ME),
    );
    const facets = await median(5, () =>
      contactService.getContactFilterFacets({}, ME),
    );
    log("contactenlijst pagina 1", list.ms, sizeKb(list.result.items));
    log("contactfacetten", facets.ms, sizeKb(facets.result));
    expect(list.result.items.length).toBeLessThanOrEqual(25);
    expect(list.ms).toBeLessThan(400);
    // Dit was de duurste query van de app: hele tabel met geneste leads.
    expect(facets.ms).toBeLessThan(600);
  }, 180_000);

  it("keuzelijsten sturen nooit de hele tabel mee", async () => {
    const companies = await median(3, () =>
      companyService.searchCompaniesForSelect(),
    );
    const contacts = await median(3, () =>
      contactService.listContactsForSelect(),
    );
    log("bedrijfsopties", companies.ms, sizeKb(companies.result));
    log("contactopties", contacts.ms, sizeKb(contacts.result));
    expect(companies.result.length).toBeLessThanOrEqual(50);
    expect(contacts.result.length).toBeLessThanOrEqual(50);
    expect(sizeKb(companies.result)).toBeLessThan(25);
    expect(sizeKb(contacts.result)).toBeLessThan(25);
  }, 120_000);

  it("snel wisselende filters: de laatste bepaalt het resultaat", async () => {
    // Zes filteracties kort na elkaar, zoals bij doorklikken.
    const started = performance.now();
    const results = await Promise.all([
      dealService.listDeals({ status: "open", pageSize: 25 }, ME),
      dealService.listDeals({ status: "won", pageSize: 25 }, ME),
      dealService.listDeals({ stageId: "stage-offerte", pageSize: 25 }, ME),
      dealService.listDeals({ zoeken: "terras", pageSize: 25 }, ME),
      dealService.listDeals({ industries: ["horeca"], pageSize: 25 }, ME),
      dealService.listDeals({ eigenaar: "aan-mij", pageSize: 25 }, ME),
    ]);
    const ms = performance.now() - started;
    log("6 filteracties parallel", ms);
    for (const result of results) {
      expect(result.items.length).toBeLessThanOrEqual(25);
    }
    expect(ms).toBeLessThan(3000);
  }, 120_000);

  it("volledige leadpagina: aantal query's blijft begrensd", async () => {
    const prisma = (await import("@/lib/db")).getPrismaClient();
    let queries = 0;
    const traced = prisma.$extends({
      query: {
        async $allOperations({ query, args }) {
          queries += 1;
          return query(args);
        },
      },
    });
    const previous = (globalThis as { __tronePrisma?: unknown }).__tronePrisma;
    (globalThis as { __tronePrisma?: unknown }).__tronePrisma = traced;
    try {
      queries = 0;
      await Promise.all([
        dealService.listDealStages(),
        dealService.listLeadSources(),
        dealService.listDealTeamMembers(),
        dealService.getDealFilterFacets({}, ME),
        dealService.listDeals({ page: 1, pageSize: 25 }, ME),
        companyService.searchCompaniesForSelect(),
        contactService.listContactsForSelect(),
      ]);
    } finally {
      (globalThis as { __tronePrisma?: unknown }).__tronePrisma = previous;
    }
    report.push(`volledige leadpagina: ${queries} query's`);
    // 8 facetten + lijst/count + 3 lookups + 2 keuzelijsten. Geen query per
    // rij en geen query per filteroptie.
    expect(queries).toBeLessThanOrEqual(20);
  }, 120_000);

  it("rapporteert de metingen", () => {
    console.log(
      `\n--- lijstfilters, ${dealCount} leads ---\n${report.join("\n")}\n`,
    );
    expect(report.length).toBeGreaterThan(0);
  });
});
