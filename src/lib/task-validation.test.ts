import { describe, expect, it } from "vitest";
import { AppError } from "@/lib/errors";
import {
  buildFollowUpInput,
  dealsIncludingCurrent,
  followUpDefaultsFromTask,
  parseCreateFollowUpForm,
  parseUpdateFollowUpForm,
  toTaskEditFormValues,
} from "@/lib/task-validation";

function form(entries: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    data.set(key, value);
  }
  return data;
}

describe("buildFollowUpInput", () => {
  it("laat een optionele vervolgactie weg zonder datum", () => {
    expect(
      buildFollowUpInput({ title: "Prospect opvolgen" }),
    ).toBeUndefined();
  });

  it("eist een datum als de titel is gewijzigd", () => {
    expect(() =>
      buildFollowUpInput({ title: "Offerte nazenden" }),
    ).toThrow(AppError);
  });

  it("laat een standaardtitel van een ander type ook weg zonder datum", () => {
    expect(buildFollowUpInput({ kind: "CALL", title: "Bellen" })).toBeUndefined();
  });

  it("gebruikt de standaardtitel van het gekozen type", () => {
    expect(
      buildFollowUpInput({
        kind: "QUOTE",
        date: "2026-09-13",
        time: "09:00",
      }),
    ).toMatchObject({
      kind: "QUOTE",
      title: "Offerte opvolgen",
    });
  });

  it("eist altijd een datum als required is", () => {
    expect(() => buildFollowUpInput({ required: true })).toThrow(AppError);
  });
});

describe("parseCreateFollowUpForm", () => {
  it("plant een vervolgactie op een lead", () => {
    const parsed = parseCreateFollowUpForm(
      form({
        dealId: "deal-1",
        followUpKind: "FOLLOW_UP",
        followUpTitle: "Prospect opvolgen",
        followUpDate: "2026-09-13",
        followUpTime: "09:00",
      }),
    );
    expect(parsed).toMatchObject({
      kind: "FOLLOW_UP",
      title: "Prospect opvolgen",
      dueDateOnly: false,
      dealId: "deal-1",
    });
    expect(parsed.dueAt.toISOString()).toBe("2026-09-13T07:00:00.000Z");
  });

  it("plant een datum-only vervolgactie", () => {
    const parsed = parseCreateFollowUpForm(
      form({
        dealId: "deal-1",
        followUpDate: "2026-09-13",
        followUpDateOnly: "on",
      }),
    );
    expect(parsed.dueDateOnly).toBe(true);
    expect(parsed.title).toBe("Prospect opvolgen");
    expect(parsed.dueAt.toISOString()).toBe("2026-09-12T22:00:00.000Z");
  });

  it("accepteert een ander taaktype", () => {
    const parsed = parseCreateFollowUpForm(
      form({
        dealId: "deal-1",
        followUpKind: "CALL",
        followUpTitle: "Bellen",
        followUpDate: "2026-09-13",
        followUpTime: "09:00",
      }),
    );
    expect(parsed).toMatchObject({
      kind: "CALL",
      title: "Bellen",
      dealId: "deal-1",
    });
  });

  it("eist een datum", () => {
    expect(() =>
      parseCreateFollowUpForm(form({ dealId: "deal-1" })),
    ).toThrow(AppError);
  });

  it("eist een koppeling", () => {
    expect(() =>
      parseCreateFollowUpForm(
        form({ followUpDate: "2026-09-13", followUpTime: "09:00" }),
      ),
    ).toThrow(AppError);
  });
});

describe("parseUpdateFollowUpForm", () => {
  it("leest het taak-id mee", () => {
    const parsed = parseUpdateFollowUpForm(
      form({
        id: "task-1",
        dealId: "deal-1",
        followUpTitle: "Offerte nazenden",
        followUpDate: "2026-09-14",
        followUpTime: "10:30",
      }),
    );
    expect(parsed.id).toBe("task-1");
    expect(parsed.title).toBe("Offerte nazenden");
    expect(parsed.dueAt.toISOString()).toBe("2026-09-14T08:30:00.000Z");
  });

  it("eist een taak-id", () => {
    expect(() =>
      parseUpdateFollowUpForm(
        form({
          dealId: "deal-1",
          followUpDate: "2026-09-13",
          followUpTime: "09:00",
        }),
      ),
    ).toThrow(AppError);
  });
});

describe("toTaskEditFormValues", () => {
  it("zet dueAt om naar ISO voor het formulier", () => {
    const values = toTaskEditFormValues({
      id: "task-1",
      title: "Prospect opvolgen",
      kind: "FOLLOW_UP",
      dueAt: new Date("2026-09-13T07:00:00.000Z"),
      dueDateOnly: false,
      dealId: "deal-1",
      contactId: "contact-1",
      companyId: null,
      deal: { id: "deal-1", title: "Caterpillar" },
    });

    expect(values.dueAt).toBe("2026-09-13T07:00:00.000Z");
    expect(values.dealTitle).toBe("Caterpillar");
    expect(followUpDefaultsFromTask(values)).toEqual({
      kind: "FOLLOW_UP",
      title: "Prospect opvolgen",
      date: "2026-09-13",
      time: "09:00",
      dateOnly: false,
    });
  });
});

describe("dealsIncludingCurrent", () => {
  const openDeals = [{ id: "deal-1", title: "Open lead", hint: "Acme" }];

  it("houdt de huidige lead zichtbaar als die niet meer open is", () => {
    expect(
      dealsIncludingCurrent(openDeals, { id: "deal-2", title: "Gesloten lead" }),
    ).toEqual([
      { id: "deal-2", title: "Gesloten lead", hint: null },
      ...openDeals,
    ]);
  });

  it("dubbeleert een al aanwezige lead niet", () => {
    expect(
      dealsIncludingCurrent(openDeals, { id: "deal-1", title: "Open lead" }),
    ).toEqual(openDeals);
  });
});
