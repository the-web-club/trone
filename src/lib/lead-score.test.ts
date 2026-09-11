import { describe, expect, it } from "vitest";
import {
  calculateLeadScore,
  emptyLeadScoreAnswers,
  leadScoreDerivedFields,
  leadScoreFilterLabel,
  leadScoreFilterWhereInput,
  leadScoreFractionLabel,
  leadScoreMatchesFilter,
  maxLeadScoreAnswers,
  parseLeadScoreAnswer,
  parseLeadScoreFilter,
  LEAD_SCORE_MAX,
} from "@/lib/lead-score";

describe("calculateLeadScore", () => {
  it("geeft Niet beoordeeld als alle antwoorden onbekend zijn", () => {
    const result = calculateLeadScore(emptyLeadScoreAnswers());
    expect(result.score).toBeNull();
    expect(result.assessedCount).toBe(0);
    expect(result.category).toBe("unassessed");
    expect(result.isNoMatch).toBe(false);
    expect(leadScoreFractionLabel(result)).toBeNull();
    expect(leadScoreDerivedFields(result)).toEqual({
      leadScore: null,
      leadScoreAssessed: 0,
      leadScoreNoMatch: false,
      leadScoreSort: -1,
    });
  });

  it("geeft 100/100 bij vijf maximale antwoorden", () => {
    const result = calculateLeadScore(maxLeadScoreAnswers());
    expect(result.score).toBe(LEAD_SCORE_MAX);
    expect(result.assessedCount).toBe(5);
    expect(result.isComplete).toBe(true);
    expect(result.category).toBe("high");
    expect(leadScoreFractionLabel(result)).toBe("100/100");
    expect(leadScoreDerivedFields(result).leadScoreSort).toBe(100);
  });

  it("onderscheidt een beoordeeld 0-puntenantwoord van Onbekend", () => {
    const unknown = calculateLeadScore(emptyLeadScoreAnswers());
    const zero = calculateLeadScore({
      ...emptyLeadScoreAnswers(),
      need: "none",
    });

    expect(unknown.score).toBeNull();
    expect(unknown.assessedCount).toBe(0);
    expect(unknown.category).toBe("unassessed");

    expect(zero.score).toBe(0);
    expect(zero.assessedCount).toBe(1);
    expect(zero.category).toBe("low");
    expect(zero.isComplete).toBe(false);
    expect(leadScoreDerivedFields(zero).leadScoreSort).toBe(0);
  });

  it("telt punten niet per vraag op en negeert onbekende antwoorden", () => {
    const result = calculateLeadScore({
      fit: "confirmed",
      need: null,
      intent: "exploring",
      decision: null,
      timing: "within_3m",
    });
    expect(result.score).toBe(20 + 5 + 15);
    expect(result.assessedCount).toBe(3);
    expect(result.category).toBe("medium");
    expect(result.breakdown.filter((item) => !item.assessed)).toHaveLength(2);
  });

  it("laat Geen match de numerieke categorie overschrijven", () => {
    const result = calculateLeadScore({
      fit: "no_fit",
      need: "confirmed",
      intent: "confirmed_next",
      decision: "involved",
      timing: "within_3m",
    });
    expect(result.score).toBe(80);
    expect(result.assessedCount).toBe(5);
    expect(result.isNoMatch).toBe(true);
    expect(result.category).toBe("no_match");
    expect(leadScoreDerivedFields(result).leadScoreSort).toBe(-1);
    expect(leadScoreMatchesFilter(result, "hoog")).toBe(false);
    expect(leadScoreMatchesFilter(result, "geen-match")).toBe(true);
  });

  it("neemt voorlopige scores mee in numerieke categorieën", () => {
    const result = calculateLeadScore({
      fit: "confirmed",
      need: "confirmed",
      intent: "confirmed_next",
      decision: "involved",
      timing: null,
    });
    expect(result.score).toBe(85);
    expect(result.assessedCount).toBe(4);
    expect(result.category).toBe("high");
    expect(leadScoreMatchesFilter(result, "hoog")).toBe(true);
    expect(leadScoreMatchesFilter(result, "onvolledig")).toBe(true);
  });
});

describe("parseLeadScoreAnswer", () => {
  it("slaat Onbekend op als null", () => {
    expect(parseLeadScoreAnswer("fit", "")).toBeNull();
    expect(parseLeadScoreAnswer("fit", "unknown")).toBeNull();
    expect(parseLeadScoreAnswer("fit", "  ")).toBeNull();
  });

  it("weigert een antwoord van een andere vraag", () => {
    expect(() => parseLeadScoreAnswer("fit", "exploring")).toThrow(
      /Ongeldig antwoord/,
    );
  });
});

describe("leadScore filters", () => {
  it("parses bekende filters en negeert onbekende", () => {
    expect(parseLeadScoreFilter("Hoog")).toBe("hoog");
    expect(parseLeadScoreFilter("onvolledig")).toBe("onvolledig");
    expect(parseLeadScoreFilter("foo")).toBe("");
  });

  it("sluit Niet beoordeeld uit van Laag", () => {
    const unassessed = calculateLeadScore(emptyLeadScoreAnswers());
    expect(leadScoreMatchesFilter(unassessed, "laag")).toBe(false);
    expect(leadScoreMatchesFilter(unassessed, "niet-beoordeeld")).toBe(true);
  });

  it("beschrijft SQL-filters consistent met de rekenregels", () => {
    expect(leadScoreFilterWhereInput("hoog")).toEqual({
      leadScoreNoMatch: false,
      leadScore: { gte: 75, lte: 100 },
    });
    expect(leadScoreFilterWhereInput("niet-beoordeeld")).toEqual({
      leadScore: null,
    });
    expect(leadScoreFilterWhereInput("onvolledig")).toEqual({
      leadScoreAssessed: { gte: 1, lte: 4 },
    });
    expect(leadScoreFilterLabel("middel")).toBe("Middel, 40–74");
  });
});
