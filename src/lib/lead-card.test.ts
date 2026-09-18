import { describe, expect, it } from "vitest";
import { hasLeadCardFacts, leadCardFacts, leadCardPhone } from "@/lib/lead-card";

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

describe("leadCardPhone", () => {
  it("geeft het nummer van de contactpersoon voorrang", () => {
    expect(
      leadCardPhone({
        contact: { phone: "06 12345678" },
        company: { phone: "020 1234567" },
      }),
    ).toBe("06 12345678");
  });

  it("valt terug op het bedrijfsnummer", () => {
    expect(
      leadCardPhone({
        contact: { phone: "  " },
        company: { phone: "020 1234567" },
      }),
    ).toBe("020 1234567");
    expect(
      leadCardPhone({ contact: null, company: { phone: "020 1234567" } }),
    ).toBe("020 1234567");
  });

  it("geeft null zonder nummer", () => {
    expect(leadCardPhone({ contact: null, company: null })).toBeNull();
    expect(
      leadCardPhone({ contact: { phone: null }, company: { phone: "" } }),
    ).toBeNull();
  });
});
