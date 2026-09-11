import { describe, expect, it } from "vitest";
import {
  buildDealsExportHref,
  buildDealsHref,
  parseDealDateField,
  parseDealSort,
  parseDealStatusFilter,
  parseDealsSearchParams,
  parseDealsView,
} from "@/lib/deals-query";

describe("buildDealsHref", () => {
  it("returns the bare path when defaults are used", () => {
    expect(buildDealsHref({})).toBe("/leads");
    expect(
      buildDealsHref({
        eigenaar: "alle",
        status: "alle",
        sortering: "nieuwste",
        view: "lijst",
        pagina: 1,
      }),
    ).toBe("/leads");
  });

  it("includes active filters and omits page 1", () => {
    expect(
      buildDealsHref({
        zoeken: "stoel",
        fase: "stage-1",
        bron: "src-web",
        eigenaar: "niet-toegewezen",
        status: "open",
        waardeMin: "1000",
        waardeMax: "5000",
        van: "2026-01-01",
        tot: "2026-08-05",
        sortering: "oudste",
        leadscore: "hoog",
      }),
    ).toBe(
      "/leads?zoeken=stoel&fase=stage-1&bron=src-web&eigenaar=niet-toegewezen&status=open&leadscore=hoog&waarde-min=1000&waarde-max=5000&van=2026-01-01&tot=2026-08-05&sortering=oudste",
    );
  });

  it("includes view=kanban and omits default lijst", () => {
    expect(buildDealsHref({ view: "kanban" })).toBe("/leads?view=kanban");
    expect(buildDealsHref({ view: "lijst", zoeken: "a" })).toBe(
      "/leads?zoeken=a",
    );
  });

  it("includes pagina only when greater than 1", () => {
    expect(buildDealsHref({ pagina: 2, zoeken: "demo" })).toBe(
      "/leads?zoeken=demo&pagina=2",
    );
  });

  it("omits default datumveld unless a date range is set", () => {
    expect(buildDealsHref({ datumveld: "verwacht" })).toBe("/leads");
    expect(buildDealsHref({ datumveld: "verwacht", van: "2026-03-01" })).toBe(
      "/leads?van=2026-03-01&datumveld=verwacht",
    );
  });
});

describe("buildDealsExportHref", () => {
  it("points to /leads/exporteren with the same filters", () => {
    expect(buildDealsExportHref({})).toBe("/leads/exporteren");
    expect(
      buildDealsExportHref({
        status: "lost",
        van: "2026-01-01",
        tot: "2026-08-10",
        zoeken: "prijs",
      }),
    ).toBe(
      "/leads/exporteren?zoeken=prijs&status=lost&van=2026-01-01&tot=2026-08-10",
    );
  });

  it("omits pagina and view from the export URL", () => {
    expect(
      buildDealsExportHref({
        status: "won",
        eigenaar: "alle",
        bron: "src-1",
      }),
    ).toBe("/leads/exporteren?bron=src-1&status=won");
  });
});

describe("parseDealsView", () => {
  it("defaults to lijst and accepts kanban", () => {
    expect(parseDealsView(undefined)).toBe("lijst");
    expect(parseDealsView("lijst")).toBe("lijst");
    expect(parseDealsView("KANBAN")).toBe("kanban");
  });
});

describe("parse helpers", () => {
  it("parses status, sort and date field with defaults", () => {
    expect(parseDealStatusFilter(undefined)).toBe("alle");
    expect(parseDealStatusFilter("WON")).toBe("won");
    expect(parseDealSort(undefined)).toBe("nieuwste");
    expect(parseDealSort("gewijzigd")).toBe("gewijzigd");
    expect(parseDealSort("leadscore")).toBe("leadscore");
    expect(parseDealDateField("verwacht")).toBe("verwacht");
    expect(parseDealDateField("aangemaakt")).toBe("aangemaakt");
  });
});

describe("parseDealsSearchParams", () => {
  it("clears the stage filter on kanban", () => {
    const parsed = parseDealsSearchParams({
      view: "kanban",
      fase: "stage-1",
      zoeken: "demo",
    });
    expect(parsed.view).toBe("kanban");
    expect(parsed.fase).toBe("");
    expect(parsed.zoeken).toBe("demo");
  });

  it("parses the leadscore filter", () => {
    const parsed = parseDealsSearchParams({
      leadscore: "onvolledig",
      sortering: "leadscore",
    });
    expect(parsed.leadscore).toBe("onvolledig");
    expect(parsed.sortering).toBe("leadscore");
  });
});
