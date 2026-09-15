import { describe, expect, it } from "vitest";
import { AppError } from "@/lib/errors";
import {
  dealCreationMatches,
  dealRecordToInput,
  firstInvalidDealField,
  mergeDealPatch,
  safeParseDealForm,
} from "@/lib/deal-validation";

const current = dealRecordToInput({
  title: "Demo ECS",
  companyId: "bedrijf-a",
  contactId: "contact-a",
  stageId: "fase-1",
  sourceId: "bron-1",
  valueEstimate: 12000,
});

describe("mergeDealPatch", () => {
  it("wijzigt alleen het opgegeven veld", () => {
    expect(mergeDealPatch(current, { title: "Nieuwe titel" })).toEqual({
      ...current,
      title: "Nieuwe titel",
    });
  });

  it("kan optionele koppelingen leegmaken", () => {
    expect(
      mergeDealPatch(current, { companyId: null, contactId: null }),
    ).toEqual({
      ...current,
      companyId: undefined,
      contactId: undefined,
    });
  });

  it("kan geschatte waarde leegmaken", () => {
    expect(mergeDealPatch(current, { valueEstimate: null }).valueEstimate).toBe(
      undefined,
    );
  });

  it("weigert een lege titel", () => {
    expect(() => mergeDealPatch(current, { title: "   " })).toThrow(AppError);
  });
});

function formData(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

describe("safeParseDealForm", () => {
  it("weigert een lege titel en laat andere velden optioneel", () => {
    const parsed = safeParseDealForm(
      formData({ title: "  ", stageId: "fase-1" }),
    );
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    expect(parsed.fieldErrors.title).toBe("Titel is verplicht");
    expect(firstInvalidDealField(parsed.fieldErrors)).toBe("title");
  });

  it("accepteert een geldige lead zonder contact of e-mail", () => {
    const parsed = safeParseDealForm(
      formData({
        title: "Caterpillar 15",
        stageId: "fase-1",
        companyId: "",
        contactId: "",
      }),
    );
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data).toEqual({
      title: "Caterpillar 15",
      stageId: "fase-1",
    });
  });

  it("toont een veldmelding bij een negatieve waarde", () => {
    const parsed = safeParseDealForm(
      formData({ title: "Lead", stageId: "fase-1", valueEstimate: "-1" }),
    );
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    expect(parsed.fieldErrors.valueEstimate).toBe(
      "Geschatte waarde moet 0 of hoger zijn",
    );
  });
});

describe("dealCreationMatches", () => {
  it("beschouwt dezelfde invoer als dezelfde indiening", () => {
    expect(dealCreationMatches(current, current)).toBe(true);
  });

  it("wijst hergebruik van een id met andere gegevens af", () => {
    expect(dealCreationMatches(current, { ...current, title: "Anders" })).toBe(
      false,
    );
  });
});
