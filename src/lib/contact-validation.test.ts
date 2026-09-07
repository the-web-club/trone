import { describe, expect, it } from "vitest";
import { AppError } from "@/lib/errors";
import {
  contactRecordToInput,
  mergeContactPatch,
  parseContactForm,
} from "@/lib/contact-validation";

function form(entries: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    data.set(key, value);
  }
  return data;
}

describe("parseContactForm", () => {
  it("accepteert een compact formulier zonder optionele velden", () => {
    const input = parseContactForm(
      form({
        firstName: "Rik",
        lastName: "Jansen",
        email: "rik@example.com",
        phone: "06 12345678",
        isPrimary: "on",
      }),
    );
    expect(input).toMatchObject({
      firstName: "Rik",
      lastName: "Jansen",
      email: "rik@example.com",
      phone: "06 12345678",
      isPrimary: true,
    });
    expect(input.jobTitle).toBeUndefined();
    expect(input.notes).toBeUndefined();
  });

  it("zet lege optionele velden om naar undefined", () => {
    const input = parseContactForm(
      form({
        firstName: "Rik",
        lastName: "",
        jobTitle: "",
        email: "",
        phone: "",
        notes: "",
      }),
    );
    expect(input.firstName).toBe("Rik");
    expect(input.lastName).toBeUndefined();
    expect(input.jobTitle).toBeUndefined();
    expect(input.email).toBeUndefined();
    expect(input.phone).toBeUndefined();
    expect(input.notes).toBeUndefined();
    expect(input.isPrimary).toBe(false);
  });

  it("eist een voornaam", () => {
    expect(() => parseContactForm(form({ lastName: "Jansen" }))).toThrow(
      /Voornaam is verplicht/,
    );
  });

  it("geeft een duidelijke fout bij ontbrekende voornaam, niet een null-typefout", () => {
    expect(() => parseContactForm(form({}))).toThrow(AppError);
    expect(() => parseContactForm(form({}))).toThrow(/Voornaam is verplicht/);
  });
});

const current = contactRecordToInput({
  firstName: "Rik",
  lastName: "Jansen",
  jobTitle: "Inkoper",
  email: "rik@example.com",
  phone: "06 12345678",
  notes: "Bestaande notitie",
  isPrimary: false,
});

describe("mergeContactPatch", () => {
  it("wijzigt alleen het opgegeven veld", () => {
    expect(mergeContactPatch(current, { jobTitle: "Directeur" })).toEqual({
      ...current,
      jobTitle: "Directeur",
    });
  });

  it("kan optionele velden leegmaken", () => {
    expect(mergeContactPatch(current, { email: null, notes: null })).toEqual({
      ...current,
      email: undefined,
      notes: undefined,
    });
  });

  it("kan primair aan- en uitzetten", () => {
    expect(mergeContactPatch(current, { isPrimary: true }).isPrimary).toBe(
      true,
    );
    expect(
      mergeContactPatch({ ...current, isPrimary: true }, { isPrimary: false })
        .isPrimary,
    ).toBe(false);
  });

  it("weigert een lege voornaam", () => {
    expect(() => mergeContactPatch(current, { firstName: "   " })).toThrow(
      AppError,
    );
  });

  it("weigert een ongeldig e-mailadres", () => {
    expect(() =>
      mergeContactPatch(current, { email: "niet-geldig" }),
    ).toThrow(AppError);
  });
});
