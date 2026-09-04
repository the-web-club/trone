import { describe, expect, it } from "vitest";
import { buildCompaniesHref, parseCompaniesSearchParams } from "@/lib/companies-query";
import { buildContactsHref, parseContactsSearchParams } from "@/lib/contacts-query";
import { buildOrdersHref, parseOrdersSearchParams } from "@/lib/orders-query";
import { buildQuotesHref, parseQuotesSearchParams } from "@/lib/quotes-query";
import { buildStaffHref, parseStaffSearchParams } from "@/lib/staff-query";

describe("list query helpers", () => {
  it("omits defaults from the URL", () => {
    expect(
      buildCompaniesHref({ zoeken: "", plaats: "", land: "", pagina: 1 }),
    ).toBe("/bedrijven");
    expect(buildContactsHref({ zoeken: "", bedrijf: "", pagina: 1 })).toBe(
      "/contacten",
    );
    expect(
      buildQuotesHref({
        zoeken: "",
        status: "",
        klant: "",
        van: "",
        tot: "",
        pagina: 1,
      }),
    ).toBe("/offertes");
    expect(
      buildOrdersHref({
        zoeken: "",
        status: "",
        klant: "",
        van: "",
        tot: "",
        pagina: 1,
      }),
    ).toBe("/orders");
    expect(buildStaffHref({ zoeken: "", rol: "", status: "", pagina: 1 })).toBe(
      "/instellingen/medewerkers",
    );
  });

  it("includes active filters and page only when greater than 1", () => {
    expect(
      buildCompaniesHref({
        zoeken: "trone",
        plaats: "Amsterdam",
        land: "NL",
        pagina: 2,
      }),
    ).toBe("/bedrijven?zoeken=trone&plaats=Amsterdam&land=NL&pagina=2");
    expect(
      buildContactsHref({ zoeken: "jan", bedrijf: "co-1", pagina: 3 }),
    ).toBe("/contacten?zoeken=jan&bedrijf=co-1&pagina=3");
    expect(
      buildQuotesHref({
        zoeken: "Q-1",
        status: "draft",
        klant: "co-2",
        van: "2026-01-01",
        tot: "2026-08-01",
        pagina: 2,
      }),
    ).toBe(
      "/offertes?zoeken=Q-1&status=DRAFT&klant=co-2&van=2026-01-01&tot=2026-08-01&pagina=2",
    );
    expect(
      buildOrdersHref({
        zoeken: "SO-1",
        status: "in_production",
        klant: "co-3",
        van: "",
        tot: "",
        pagina: 1,
      }),
    ).toBe("/orders?zoeken=SO-1&status=IN_PRODUCTION&klant=co-3");
  });

  it("parses search params and ignores unknown status values", () => {
    expect(
      parseCompaniesSearchParams({ zoeken: "a", plaats: "Breda", pagina: "0" }),
    ).toEqual({
      zoeken: "a",
      plaats: "Breda",
      land: "",
      pagina: 1,
    });
    expect(parseContactsSearchParams({ bedrijf: "co-1" })).toEqual({
      zoeken: "",
      bedrijf: "co-1",
      pagina: 1,
    });
    expect(parseQuotesSearchParams({ status: "expired" }).status).toBe("EXPIRED");
    expect(parseQuotesSearchParams({ status: "foo" }).status).toBe("");
    expect(parseOrdersSearchParams({ status: "ready" }).status).toBe("READY");
    expect(parseStaffSearchParams({ rol: "admin", status: "invited" })).toEqual({
      zoeken: "",
      rol: "admin",
      status: "invited",
      pagina: 1,
    });
  });
});
