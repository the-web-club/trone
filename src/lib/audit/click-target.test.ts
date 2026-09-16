import { describe, expect, it } from "vitest";
import {
  describeAuditClick,
  type AuditClickElement,
} from "@/lib/audit/click-target";

/**
 * Bouwt een minimale elementketen. Voldoet aan `AuditClickElement`, zodat de
 * klikherkenning te testen is in de node-omgeving van dit project (er is geen
 * jsdom en die hoort er voor deze logica ook niet bij te komen).
 */
function element(
  tagName: string,
  attributes: Record<string, string> = {},
  options: { text?: string; parent?: AuditClickElement } = {},
): AuditClickElement {
  return {
    tagName,
    getAttribute: (name) => attributes[name] ?? null,
    textContent: options.text ?? null,
    parentElement: options.parent ?? null,
  };
}

describe("describeAuditClick", () => {
  it("herkent een knop en gebruikt de expliciete audit-attributen", () => {
    const button = element(
      "BUTTON",
      {
        "data-audit-action": "lead.create_open",
        "data-audit-target": "lead-create-button",
        "data-audit-label": "Nieuwe lead",
        "data-audit-component": "CreateLeadListDialog",
      },
      { text: "Nieuwe lead toevoegen" },
    );

    expect(describeAuditClick(button)).toEqual({
      targetType: "button",
      targetKey: "lead-create-button",
      targetLabel: "Nieuwe lead",
      href: null,
      component: "CreateLeadListDialog",
      action: "lead.create_open",
    });
  });

  it("klimt van het geklikte icoon naar de omliggende knop", () => {
    const button = element("BUTTON", { "aria-label": "Filters wissen" });
    const icon = element("SVG", {}, { parent: button });
    const path = element("PATH", {}, { parent: icon });

    const result = describeAuditClick(path);
    expect(result?.targetType).toBe("button");
    expect(result?.targetLabel).toBe("Filters wissen");
  });

  it("valt terug op aria-label, title en dan zichtbare tekst", () => {
    expect(
      describeAuditClick(element("BUTTON", { "aria-label": "Sluiten" })),
    ).toMatchObject({ targetLabel: "Sluiten" });
    expect(
      describeAuditClick(element("BUTTON", { title: "Kopieer" })),
    ).toMatchObject({ targetLabel: "Kopieer" });
    expect(
      describeAuditClick(element("BUTTON", {}, { text: "  Opslaan\n " })),
    ).toMatchObject({ targetLabel: "Opslaan" });
  });

  it("gebruikt het pad van een link als sleutel en redigeert de querystring", () => {
    const link = element(
      "A",
      { href: "/wachtwoord-instellen?token=geheim" },
      { text: "Stel wachtwoord in" },
    );
    const result = describeAuditClick(link);
    expect(result?.targetType).toBe("link");
    expect(result?.targetKey).not.toContain("geheim");
    expect(result?.href).not.toContain("geheim");
  });

  it("logt niets wanneer een voorouder data-audit-ignore heeft", () => {
    const ignored = element("DIV", { "data-audit-ignore": "" });
    const button = element("BUTTON", { "aria-label": "Klik" }, { parent: ignored });
    expect(describeAuditClick(button)).toBeNull();
  });

  it("logt niets bij een klik op niet-interactieve inhoud", () => {
    const paragraph = element("P", {}, { text: "Gewone tekst" });
    expect(describeAuditClick(paragraph)).toBeNull();
    expect(describeAuditClick(null)).toBeNull();
  });

  it("herkent rollen: tab, menuitem en switch", () => {
    expect(
      describeAuditClick(element("DIV", { role: "tab" }, { text: "Kanban" })),
    ).toMatchObject({ targetType: "tab" });
    expect(
      describeAuditClick(element("DIV", { role: "menuitem" })),
    ).toMatchObject({ targetType: "menuitem" });
    expect(describeAuditClick(element("DIV", { role: "switch" }))).toMatchObject(
      { targetType: "switch" },
    );
  });

  it("herkent inputs die een actie zijn en negeert een tekstveld", () => {
    expect(
      describeAuditClick(element("INPUT", { type: "submit", value: "Verstuur" })),
    ).toMatchObject({ targetType: "input-submit", targetLabel: "Verstuur" });
    expect(describeAuditClick(element("INPUT", { type: "text" }))).toBeNull();
  });

  it("kapt een lang label af zodat er geen vrije tekst het log in gaat", () => {
    const button = element("BUTTON", {}, { text: "z".repeat(500) });
    expect(describeAuditClick(button)?.targetLabel?.length).toBe(80);
  });

  it("levert voor twee identieke kliks twee identieke beschrijvingen op", () => {
    // Dedup gebeurt op clientEventId, niet op de beschrijving: twee echte kliks
    // op dezelfde knop moeten twee events blijven.
    const button = element("BUTTON", { "data-audit-target": "opslaan" });
    const first = describeAuditClick(button);
    const second = describeAuditClick(button);
    expect(first).toEqual(second);
    expect(first).not.toBeNull();
  });
});
