import { describe, expect, it } from "vitest";
import {
  companyClassificationWhere,
  contactClassificationWhere,
  dealClassificationWhere,
} from "@/lib/classification-where";

describe("dealClassificationWhere", () => {
  it("onderscheidt geen bedrijf, onbekende branche en onbekende sector", () => {
    expect(
      dealClassificationWhere({
        industries: ["geen-bedrijf"],
        sectors: [],
        applications: [],
      }),
    ).toEqual({ companyId: null });

    expect(
      dealClassificationWhere({
        industries: ["onbekend"],
        sectors: [],
        applications: [],
      }),
    ).toEqual({
      companyId: { not: null },
      company: { industryCode: null },
    });

    expect(
      dealClassificationWhere({
        industries: [],
        sectors: ["onbekend"],
        applications: [],
      }),
    ).toEqual({
      company: { industryCode: { not: null }, sectorCode: null },
    });
  });

  it("combineert branche van het gekoppelde bedrijf met toepassing van de aanvraag", () => {
    expect(
      dealClassificationWhere({
        industries: ["industrie_productie"],
        sectors: ["chemie"],
        applications: ["heftruck_intern_transport"],
      }),
    ).toEqual({
      AND: [
        { company: { industryCode: { in: ["industrie_productie"] } } },
        { company: { sectorCode: { in: ["chemie"] } } },
        {
          applications: {
            some: { code: { in: ["heftruck_intern_transport"] } },
          },
        },
      ],
    });
  });

  it("combineert ontbrekende toepassingen met OR binnen het facet", () => {
    expect(
      dealClassificationWhere({
        industries: [],
        sectors: [],
        applications: ["kraan", "onbekend"],
      }),
    ).toEqual({
      OR: [
        { applications: { some: { code: { in: ["kraan"] } } } },
        { applications: { none: {} } },
      ],
    });
  });
});

describe("companyClassificationWhere", () => {
  it("levert elk bedrijf één keer op via deals.some", () => {
    expect(
      companyClassificationWhere({
        industries: ["bouw_infra_grondverzet"],
        sectors: [],
        applications: ["kraan"],
      }),
    ).toEqual({
      AND: [
        { industryCode: { in: ["bouw_infra_grondverzet"] } },
        {
          deals: {
            some: { applications: { some: { code: { in: ["kraan"] } } } },
          },
        },
      ],
    });
  });
});

describe("contactClassificationWhere", () => {
  it("koppelt branche en toepassing via hetzelfde bedrijf", () => {
    const where = contactClassificationWhere({
      industries: ["industrie_productie"],
      sectors: [],
      applications: ["heftruck_intern_transport"],
    });

    expect(where).toEqual({
      AND: [
        { company: { industryCode: { in: ["industrie_productie"] } } },
        {
          deals: {
            some: {
              AND: [
                { company: { industryCode: { in: ["industrie_productie"] } } },
                {
                  applications: {
                    some: { code: { in: ["heftruck_intern_transport"] } },
                  },
                },
              ],
            },
          },
        },
      ],
    });
  });

  it("filtert toepassing via expliciet gekoppelde aanvragen", () => {
    expect(
      contactClassificationWhere({
        industries: [],
        sectors: [],
        applications: ["kraan"],
      }),
    ).toEqual({
      deals: { some: { applications: { some: { code: { in: ["kraan"] } } } } },
    });
  });

  it("filtert contacten zonder bedrijf", () => {
    expect(
      contactClassificationWhere({
        industries: ["geen-bedrijf"],
        sectors: [],
        applications: [],
      }),
    ).toEqual({ companyId: null });
  });
});
