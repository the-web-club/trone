/**
 * "Other Filters Changed": de telling voor facet F gebruikt alle actieve
 * filters behalve F. Deze test kijkt naar de gebonden parameters van de
 * gegenereerde SQL, dus zonder database.
 */
import { describe, expect, it } from "vitest";

import {
  andSql,
  companyLeadBucketSql,
  companyWhereSql,
  contactWhereSql,
  dealWhereSql,
} from "@/lib/filters/sql-where";

const values = (fragment: { values: readonly unknown[] }) =>
  fragment.values.map((value) =>
    value instanceof Date ? value.toISOString() : value,
  );

describe("lead-facetten sluiten hun eigen dimensie uit", () => {
  const filters = {
    zoeken: "stoel",
    stageId: "stage-lead",
    sourceId: "src-web",
    eigenaar: "user-42",
    status: "open" as const,
    leadscore: "hoog" as const,
    industries: ["horeca"],
    sectors: ["restaurant"],
    applications: ["terras"],
  };

  it("fase-facet houdt de andere filters, niet de fase", () => {
    const bound = values(dealWhereSql({ ...filters, stageId: undefined }, "me"));
    expect(bound).not.toContain("stage-lead");
    expect(bound).toContain("src-web");
    expect(bound).toContain("user-42");
    expect(bound).toContain("%stoel%");
    expect(bound).toContain("horeca");
  });

  it("bron-facet houdt de fase, niet de bron", () => {
    const bound = values(dealWhereSql({ ...filters, sourceId: undefined }, "me"));
    expect(bound).not.toContain("src-web");
    expect(bound).toContain("stage-lead");
  });

  it("eigenaar-facet laat de eigenaar vallen, ook bij aan-mij", () => {
    const bound = values(
      dealWhereSql({ ...filters, eigenaar: "alle" }, "user-me"),
    );
    expect(bound).not.toContain("user-42");
    expect(bound).not.toContain("user-me");
    expect(bound).toContain("stage-lead");
  });

  it("status-facet houdt de fase, niet de status", () => {
    const fragment = dealWhereSql({ ...filters, status: "alle" }, "me");
    expect(fragment.sql).not.toContain("'OPEN'");
    expect(values(fragment)).toContain("stage-lead");
  });

  it("leadscore-facet laat de scoregrenzen vallen", () => {
    const bound = values(dealWhereSql({ ...filters, leadscore: "" }, "me"));
    expect(bound).not.toContain(75);
    expect(bound).toContain("stage-lead");
  });

  it("branche-facet houdt sector en toepassing, niet de branche", () => {
    const bound = values(dealWhereSql({ ...filters, industries: [] }, "me"));
    expect(bound).not.toContain("horeca");
    expect(bound).toContain("restaurant");
    expect(bound).toContain("terras");
  });

  it("toepassing-facet houdt branche en sector, niet de toepassing", () => {
    const bound = values(dealWhereSql({ ...filters, applications: [] }, "me"));
    expect(bound).not.toContain("terras");
    expect(bound).toContain("horeca");
    expect(bound).toContain("restaurant");
  });

  it("aan-mij valt terug op een onmogelijke waarde zonder sessie", () => {
    const bound = values(dealWhereSql({ eigenaar: "aan-mij" }, undefined));
    expect(bound).toContain("__no_match__");
  });
});

describe("bedrijf-facetten sluiten hun eigen dimensie uit", () => {
  const filters = {
    query: "acme",
    city: "Amsterdam",
    country: "NL",
    eigenaar: "user-42",
    leads: "5plus",
    industries: ["horeca"],
  };

  it("plaats-facet houdt land en branche, niet de plaats", () => {
    const bound = values(
      andSql([
        companyWhereSql({ ...filters, city: undefined }, "me"),
        companyLeadBucketSql(filters.leads),
      ]),
    );
    expect(bound).not.toContain("Amsterdam");
    expect(bound).toContain("NL");
    expect(bound).toContain("horeca");
  });

  it("leads-facet houdt de plaats, maar laat de bucket vallen", () => {
    const fragment = companyWhereSql({ ...filters, leads: "alle" }, "me");
    expect(values(fragment)).toContain("Amsterdam");
    expect(fragment.sql).not.toContain(">= 5");
  });

  it("lead-bucket blijft een subquery-predicaat, geen id-lijst", () => {
    const fragment = companyLeadBucketSql("5plus");
    expect(fragment?.sql).toContain("SELECT COUNT(*) FROM deal");
    expect(fragment?.values).toHaveLength(0);
  });

  it("exacte bucket bindt het aantal als parameter", () => {
    expect(companyLeadBucketSql("3")?.values).toContain(3);
  });

  it("onbekende bucket levert geen predicaat", () => {
    expect(companyLeadBucketSql("alle")).toBeUndefined();
    expect(companyLeadBucketSql("9")).toBeUndefined();
  });
});

describe("contact-facetten sluiten hun eigen dimensie uit", () => {
  const filters = {
    query: "jansen",
    companyId: "co-1",
    eigenaar: "user-42",
    industries: ["horeca"],
    applications: ["terras"],
  };

  it("bedrijf-facet houdt de eigenaar, niet het bedrijf", () => {
    const bound = values(
      contactWhereSql({ ...filters, companyId: undefined }, "me"),
    );
    expect(bound).not.toContain("co-1");
    expect(bound).toContain("user-42");
  });

  it("branche EN toepassing lopen via dezelfde lead en hetzelfde bedrijf", () => {
    const fragment = contactWhereSql(
      { industries: ["horeca"], applications: ["terras"] },
      "me",
    );
    // Één EXISTS over deal met daarin zowel het bedrijfs- als het
    // toepassingspredicaat: anders kan een contact matchen op branche via
    // bedrijf A en op toepassing via een lead bij bedrijf B.
    expect(fragment.sql).toContain("FROM deal d");
    expect(fragment.sql).toContain("d.contactId = ct.id");
    const dealBlock = fragment.sql.slice(fragment.sql.indexOf("FROM deal d"));
    expect(dealBlock).toContain("c.id = d.companyId");
    expect(dealBlock).toContain("deal_application");
  });

  it("te korte zoekterm levert geen zoekpredicaat", () => {
    const bound = values(contactWhereSql({ query: "ab" }, "me"));
    expect(bound).not.toContain("%ab%");
  });
});

describe("zoektermen zijn LIKE-veilig", () => {
  it("escapet procent en underscore", () => {
    expect(values(dealWhereSql({ zoeken: "50%" }, "me"))).toContain("%50\\%%");
    expect(values(dealWhereSql({ zoeken: "a_b" }, "me"))).toContain("%a\\_b%");
  });
});
