import { describe, expect, it } from "vitest";
import {
  buildFeatureRequestHref,
  parseFeatureRequestSearchParams,
  statusValuesForFilter,
  typeValueForFilter,
} from "@/lib/feature-request-query";

describe("feature request query", () => {
  it("omits defaults from the URL", () => {
    expect(
      buildFeatureRequestHref({
        zoeken: "",
        type: "alle",
        status: "actief",
        mijnStemmen: false,
        sortering: "populair",
        pagina: 1,
      }),
    ).toBe("/instellingen/feedback");
  });

  it("includes filters and page only when they differ from defaults", () => {
    expect(
      buildFeatureRequestHref({
        zoeken: "sidebar",
        type: "bug",
        status: "alle",
        mijnStemmen: true,
        sortering: "nieuwste",
        pagina: 2,
      }),
    ).toBe(
      "/instellingen/feedback?zoeken=sidebar&type=bug&status=alle&mijn-stemmen=1&sortering=nieuwste&pagina=2",
    );
  });

  it("defaults to active requests sorted by popularity", () => {
    expect(parseFeatureRequestSearchParams({})).toEqual({
      zoeken: "",
      type: "alle",
      status: "actief",
      mijnStemmen: false,
      sortering: "populair",
      pagina: 1,
    });
  });

  it("parses mijn-stemmen flags", () => {
    expect(
      parseFeatureRequestSearchParams({ "mijn-stemmen": "1" }).mijnStemmen,
    ).toBe(true);
    expect(
      parseFeatureRequestSearchParams({ "mijn-stemmen": "ja" }).mijnStemmen,
    ).toBe(true);
  });

  it("maps type and status filters to stored values", () => {
    expect(typeValueForFilter("ux")).toBe("UX_DESIGN");
    expect(typeValueForFilter("alle")).toBeUndefined();
    expect(statusValuesForFilter("actief")).toEqual([
      "OPEN",
      "PLANNED",
      "IN_PROGRESS",
    ]);
    expect(statusValuesForFilter("alle")).toBeUndefined();
    expect(statusValuesForFilter("samengevoegd")).toEqual(["MERGED"]);
  });
});
