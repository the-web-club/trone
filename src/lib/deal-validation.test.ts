import { describe, expect, it } from "vitest";
import { AppError } from "@/lib/errors";
import {
  dealRecordToInput,
  mergeDealPatch,
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
