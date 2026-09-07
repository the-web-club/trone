import { describe, expect, it } from "vitest";
import { AppError } from "@/lib/errors";
import { parseContactForm } from "@/lib/contact-validation";

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
