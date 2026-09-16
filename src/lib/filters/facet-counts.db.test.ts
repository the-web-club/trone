/**
 * Facet-tellingen moeten exact gelijk zijn aan het lijsttotaal dat je krijgt
 * als je die optie daadwerkelijk aanzet. Dat is de definitie van de telling,
 * en tegelijk de sterkste controle op de SQL-aggregatie.
 *
 * Vereist een database (bench-dataset). Zonder database slaat de suite over.
 */
import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const hasDatabase = Boolean(
  process.env.DATABASE_HOST &&
    process.env.DATABASE_NAME &&
    process.env.DATABASE_USER,
);

const ME = "bench-user-1";

describe.runIf(hasDatabase)("facet-tellingen kloppen met het lijsttotaal", () => {
  let dealService: typeof import("@/lib/deal-service");
  let companyService: typeof import("@/lib/company-service");
  let contactService: typeof import("@/lib/contact-service");

  beforeAll(async () => {
    dealService = await import("@/lib/deal-service");
    companyService = await import("@/lib/company-service");
    contactService = await import("@/lib/contact-service");
  }, 60_000);

  async function dealTotal(filters: Record<string, unknown>) {
    return (
      await dealService.listDeals({ ...filters, pageSize: 1 } as never, ME)
    ).total;
  }

  it("lead: fase-tellingen", async () => {
    const facets = await dealService.getDealFilterFacets({}, ME);
    expect(facets.byStage.length).toBeGreaterThan(0);
    for (const row of facets.byStage) {
      expect(await dealTotal({ stageId: row.stageId })).toBe(row.count);
    }
  }, 60_000);

  it("lead: status- en bron-tellingen, ook 'geen bron'", async () => {
    const facets = await dealService.getDealFilterFacets({}, ME);
    for (const [status, count] of Object.entries(facets.byStatus)) {
      expect(await dealTotal({ status: status.toLowerCase() })).toBe(count);
    }
    for (const row of facets.bySource.slice(0, 4)) {
      expect(await dealTotal({ sourceId: row.sourceId })).toBe(row.count);
    }
    expect(await dealTotal({ sourceId: "geen" })).toBe(facets.unassignedSource);
  }, 60_000);

  it("lead: eigenaar-tellingen, inclusief niet-toegewezen en aan-mij", async () => {
    const facets = await dealService.getDealFilterFacets({}, ME);
    expect(await dealTotal({ eigenaar: "niet-toegewezen" })).toBe(
      facets.unassignedOwner,
    );
    expect(await dealTotal({ eigenaar: "aan-mij" })).toBe(facets.assignedToMe);
    for (const row of facets.byOwner.slice(0, 3)) {
      expect(await dealTotal({ eigenaar: row.userId })).toBe(row.count);
    }
  }, 60_000);

  it("lead: leadscore-tellingen per bucket", async () => {
    const facets = await dealService.getDealFilterFacets({}, ME);
    for (const [filter, count] of Object.entries(facets.byScore)) {
      expect(await dealTotal({ leadscore: filter })).toBe(count);
    }
  }, 60_000);

  it("lead: branche-tellingen, inclusief geen-bedrijf en onbekend", async () => {
    const facets = await dealService.getDealFilterFacets({}, ME);
    for (const row of facets.byIndustry) {
      expect(await dealTotal({ industries: [row.value] })).toBe(row.count);
    }
  }, 120_000);

  it("lead: sector- en toepassing-tellingen", async () => {
    const facets = await dealService.getDealFilterFacets({}, ME);
    for (const row of facets.bySector) {
      expect(await dealTotal({ sectors: [row.value] })).toBe(row.count);
    }
    for (const row of facets.byApplication) {
      expect(await dealTotal({ applications: [row.value] })).toBe(row.count);
    }
  }, 120_000);

  it("lead: tellingen blijven kloppen met een actief zoekfilter erbij", async () => {
    const base = { zoeken: "Terras", status: "open" as const };
    const facets = await dealService.getDealFilterFacets(base, ME);
    for (const row of facets.byStage) {
      expect(await dealTotal({ ...base, stageId: row.stageId })).toBe(row.count);
    }
    for (const row of facets.byIndustry) {
      expect(await dealTotal({ ...base, industries: [row.value] })).toBe(
        row.count,
      );
    }
  }, 120_000);

  it("lead: totaal per dimensie is het totaal zonder die dimensie", async () => {
    const facets = await dealService.getDealFilterFacets(
      { stageId: "stage-offerte" },
      ME,
    );
    expect(facets.stageTotal).toBe(await dealTotal({}));
  }, 60_000);

  async function companyTotal(filters: Record<string, unknown>) {
    return (
      await companyService.listCompanyRows(
        { ...filters, pageSize: 1 } as never,
        ME,
      )
    ).total;
  }

  it("bedrijf: plaats, land en eigenaar", async () => {
    const facets = await companyService.getCompanyFilterFacets({}, ME);
    for (const row of facets.byCity.slice(0, 5)) {
      expect(await companyTotal({ city: row.value })).toBe(row.count);
    }
    expect(await companyTotal({ city: "onbekend" })).toBe(facets.unassignedCity);
    for (const row of facets.byCountry) {
      expect(await companyTotal({ country: row.value })).toBe(row.count);
    }
    expect(await companyTotal({ eigenaar: "niet-toegewezen" })).toBe(
      facets.unassignedOwner,
    );
    expect(await companyTotal({ eigenaar: "aan-mij" })).toBe(
      facets.assignedToMe,
    );
  }, 120_000);

  it("bedrijf: lead-buckets kloppen met het lijsttotaal", async () => {
    const facets = await companyService.getCompanyFilterFacets({}, ME);
    expect(await companyTotal({ leads: "geen" })).toBe(facets.leads.none);
    for (const bucket of ["1", "2", "3", "4", "5plus"] as const) {
      expect(await companyTotal({ leads: bucket })).toBe(
        facets.leads.byCount[bucket],
      );
    }
  }, 120_000);

  it("bedrijf: branche, sector en toepassing", async () => {
    const facets = await companyService.getCompanyFilterFacets({}, ME);
    for (const row of facets.byIndustry) {
      expect(await companyTotal({ industries: [row.value] })).toBe(row.count);
    }
    for (const row of facets.bySector) {
      expect(await companyTotal({ sectors: [row.value] })).toBe(row.count);
    }
    for (const row of facets.byApplication) {
      expect(await companyTotal({ applications: [row.value] })).toBe(row.count);
    }
  }, 180_000);

  it("bedrijf: buckets blijven kloppen naast een actief plaatsfilter", async () => {
    const base = { city: "Amsterdam" };
    const facets = await companyService.getCompanyFilterFacets(base, ME);
    for (const bucket of ["1", "5plus"] as const) {
      expect(await companyTotal({ ...base, leads: bucket })).toBe(
        facets.leads.byCount[bucket],
      );
    }
  }, 120_000);

  async function contactTotal(filters: Record<string, unknown>) {
    return (
      await contactService.listContactRows(
        { ...filters, pageSize: 1 } as never,
        ME,
      )
    ).total;
  }

  it("contact: bedrijf en eigenaar", async () => {
    const facets = await contactService.getContactFilterFacets({}, ME);
    for (const row of facets.byCompany.slice(0, 5)) {
      expect(await contactTotal({ companyId: row.value })).toBe(row.count);
    }
    expect(await contactTotal({ companyId: "geen-bedrijf" })).toBe(
      facets.unassignedCompany,
    );
    expect(await contactTotal({ eigenaar: "niet-toegewezen" })).toBe(
      facets.unassignedOwner,
    );
  }, 120_000);

  it("contact: branche, sector en toepassing", async () => {
    const facets = await contactService.getContactFilterFacets({}, ME);
    for (const row of facets.byIndustry) {
      expect(await contactTotal({ industries: [row.value] })).toBe(row.count);
    }
    for (const row of facets.bySector) {
      expect(await contactTotal({ sectors: [row.value] })).toBe(row.count);
    }
    for (const row of facets.byApplication) {
      expect(await contactTotal({ applications: [row.value] })).toBe(row.count);
    }
  }, 180_000);

  it("contact: leads zonder bedrijf blijven vindbaar en telbaar", async () => {
    const facets = await contactService.getContactFilterFacets({}, ME);
    const noCompany = facets.byIndustry.find(
      (row) => row.value === "geen-bedrijf",
    );
    expect(noCompany).toBeDefined();
    expect(noCompany?.count).toBeGreaterThan(0);
    expect(await contactTotal({ industries: ["geen-bedrijf"] })).toBe(
      noCompany?.count,
    );
  }, 60_000);

  it("lege resultaten geven tellingen van nul, niet een fout", async () => {
    const facets = await dealService.getDealFilterFacets(
      { zoeken: "zzzzgeenenkelresultaatzzzz" },
      ME,
    );
    expect(facets.stale).toBe(false);
    expect(facets.stageTotal).toBe(0);
    expect(facets.byScore.hoog).toBe(0);
    expect(await dealTotal({ zoeken: "zzzzgeenenkelresultaatzzzz" })).toBe(0);
  }, 60_000);
});
