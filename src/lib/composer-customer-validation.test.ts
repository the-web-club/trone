import { describe, expect, it } from "vitest";
import { AppError } from "@/lib/errors";
import { parseComposerCompanyForm } from "@/lib/company-validation";
import { parseOptionalComposerContactForm } from "@/lib/contact-validation";

function form(entries: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    data.set(key, value);
  }
  return data;
}

describe("parseComposerCompanyForm", () => {
  it("leest de compacte bedrijfsvelden", () => {
    const input = parseComposerCompanyForm(
      form({
        companyName: "Hoveniers Jansen",
        companyPhone: "06 12345678",
        companyEmail: "info@example.com",
      }),
    );
    expect(input.name).toBe("Hoveniers Jansen");
    expect(input.phone).toBe("06 12345678");
    expect(input.email).toBe("info@example.com");
    expect(input.country).toBe("NL");
    expect(input.vatRate).toBe(21);
  });

  it("eist een bedrijfsnaam", () => {
    expect(() => parseComposerCompanyForm(form({ companyName: "  " }))).toThrow(
      AppError,
    );
  });
});

describe("parseOptionalComposerContactForm", () => {
  it("slaat een leeg contact over", () => {
    expect(parseOptionalComposerContactForm(form({}))).toBeNull();
  });

  it("eist een voornaam als andere contactvelden zijn ingevuld", () => {
    expect(() =>
      parseOptionalComposerContactForm(form({ contactPhone: "06 12345678" })),
    ).toThrow(/Voornaam is verplicht/);
  });

  it("leest een ingevuld contact", () => {
    const input = parseOptionalComposerContactForm(
      form({
        firstName: "Rik",
        lastName: "Jansen",
        contactPhone: "06 12345678",
        contactEmail: "rik@example.com",
      }),
    );
    expect(input).toMatchObject({
      firstName: "Rik",
      lastName: "Jansen",
      phone: "06 12345678",
      email: "rik@example.com",
      isPrimary: true,
    });
  });
});
