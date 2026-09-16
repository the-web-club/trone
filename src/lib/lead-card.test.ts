import { describe, expect, it } from "vitest";
import { hasLeadCardFacts, leadCardFacts } from "@/lib/lead-card";

describe("leadCardFacts", () => {
  it("verbergt lege offerte, waarde en bron", () => {
    expect(
      leadCardFacts({
        valueEstimate: null,
        quoteStatus: null,
        sourceName: null,
      }),
    ).toEqual({
      value: null,
      quoteStatus: null,
      sourceName: null,
    });
    expect(
      hasLeadCardFacts(
        leadCardFacts({
          valueEstimate: null,
          quoteStatus: null,
          sourceName: "  ",
        }),
      ),
    ).toBe(false);
  });

  it("toont een geldige waarde 0", () => {
    const facts = leadCardFacts({
      valueEstimate: 0,
      quoteStatus: null,
      sourceName: null,
    });
    expect(facts.value).toMatch(/€\s*0/);
    expect(hasLeadCardFacts(facts)).toBe(true);
  });

  it("houdt gevulde offerte en bron compact zichtbaar", () => {
    const facts = leadCardFacts({
      valueEstimate: 12500,
      quoteStatus: "SENT",
      sourceName: "Website",
    });
    expect(facts.value).toMatch(/€\s*12.500/);
    expect(facts.quoteStatus).toBe("SENT");
    expect(facts.sourceName).toBe("Website");
    expect(hasLeadCardFacts(facts)).toBe(true);
  });
});
