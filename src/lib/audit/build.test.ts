import { describe, expect, it } from "vitest";
import { buildAuditEventRow } from "@/lib/audit/build";
import { AUDIT_REDACTED } from "@/lib/audit/sanitize";
import { AUDIT_SYSTEM_ACTOR } from "@/lib/audit/types";

const NOW = new Date("2026-09-16T10:00:00.000Z");

const ACTOR = {
  userId: "user-1",
  name: "Frederik Derks",
  email: "frederik@example.com",
  role: "admin",
};

describe("buildAuditEventRow", () => {
  it("neemt de actor als snapshot over", () => {
    const row = buildAuditEventRow(
      {
        eventType: "CREATE",
        category: "LEADS",
        action: "lead.create",
        entityType: "deal",
        entityId: "deal-1",
        entityLabel: "Acme — 40 stoelen",
      },
      { actor: ACTOR, now: NOW, id: "event-1" },
    );

    expect(row).toMatchObject({
      id: "event-1",
      eventType: "CREATE",
      category: "LEADS",
      action: "lead.create",
      source: "SERVER_ACTION",
      severity: "INFO",
      result: "SUCCESS",
      actorUserId: "user-1",
      actorNameSnapshot: "Frederik Derks",
      actorEmailSnapshot: "frederik@example.com",
      actorRoleSnapshot: "admin",
      entityLabel: "Acme — 40 stoelen",
      occurredAt: NOW,
      eventVersion: 1,
    });
  });

  it("werkt zonder actor: een systeemevent heeft geen actorUserId", () => {
    const row = buildAuditEventRow(
      {
        eventType: "IMPORT_COMPLETED",
        category: "IMPORT_EXPORT",
        action: "import.leads",
        source: "SYSTEM",
      },
      { actor: AUDIT_SYSTEM_ACTOR, now: NOW },
    );

    expect(row.actorUserId).toBeNull();
    expect(row.actorNameSnapshot).toBeNull();
    expect(row.actorEmailSnapshot).toBeNull();
    expect(row.source).toBe("SYSTEM");
  });

  it("leidt severity af uit het resultaat", () => {
    const base = {
      eventType: "UPDATE",
      category: "DATA",
      action: "x.y",
    } as const;
    expect(
      buildAuditEventRow({ ...base, result: "FAILURE" }, { now: NOW }).severity,
    ).toBe("ERROR");
    expect(
      buildAuditEventRow({ ...base, result: "DENIED" }, { now: NOW }).severity,
    ).toBe("WARNING");
    expect(
      buildAuditEventRow({ ...base, result: "PARTIAL" }, { now: NOW }).severity,
    ).toBe("WARNING");
    expect(buildAuditEventRow(base, { now: NOW }).severity).toBe("INFO");
    // Een expliciete severity blijft staan.
    expect(
      buildAuditEventRow(
        { ...base, result: "FAILURE", severity: "CRITICAL" },
        { now: NOW },
      ).severity,
    ).toBe("CRITICAL");
  });

  it("normaliseert eventType, action en route", () => {
    const row = buildAuditEventRow(
      {
        eventType: "ui click",
        category: "UI",
        action: "  UI..Click  ",
        route: "/leads?zoeken=jan",
      },
      { now: NOW },
    );
    expect(row.eventType).toBe("UI_CLICK");
    expect(row.action).toBe("ui.click");
    expect(row.route).toBe("/leads");
  });

  it("valt terug op een onbekende bron met de standaardbron", () => {
    const row = buildAuditEventRow(
      {
        eventType: "UPDATE",
        category: "DATA",
        action: "x.y",
        source: "VERZONNEN" as never,
      },
      { now: NOW },
    );
    expect(row.source).toBe("SERVER_ACTION");
  });

  it("saniteert de metadata die de rij in gaat", () => {
    const row = buildAuditEventRow(
      {
        eventType: "FORM_SUBMITTED",
        category: "UI",
        action: "form.submit",
        metadata: { password: "geheim", veld: "naam" },
      },
      { now: NOW },
    );
    expect(row.metadata).toEqual({ password: AUDIT_REDACTED, veld: "naam" });
  });

  it("bouwt een zoekveld uit actie, route, labels en actor", () => {
    const row = buildAuditEventRow(
      {
        eventType: "UPDATE",
        category: "COMPANIES",
        action: "company.update",
        route: "/bedrijven/acme",
        entityLabel: "Acme BV",
      },
      { actor: ACTOR, now: NOW },
    );
    expect(row.searchIndex).toBe(
      "company.update /bedrijven/acme acme bv frederik derks frederik@example.com",
    );
  });

  it("negeert een ongeldige occurredAt en valt terug op nu", () => {
    const row = buildAuditEventRow(
      {
        eventType: "PAGE_VIEW",
        category: "NAVIGATION",
        action: "navigation.leads",
        occurredAt: new Date("kapot"),
      },
      { now: NOW },
    );
    expect(row.occurredAt).toEqual(NOW);
  });

  it("kapt te lange labels af op de kolomgrootte", () => {
    const row = buildAuditEventRow(
      {
        eventType: "UI_CLICK",
        category: "UI",
        action: "ui.click",
        entityLabel: "x".repeat(400),
        targetLabel: "y".repeat(400),
      },
      { now: NOW },
    );
    expect(row.entityLabel?.length).toBe(191);
    expect(row.targetLabel?.length).toBe(191);
  });
});
