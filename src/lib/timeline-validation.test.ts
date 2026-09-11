import { describe, expect, it } from "vitest";
import { AppError } from "@/lib/errors";
import {
  isManualTimelineType,
  parseTimelineEventForm,
  parseTimelineEventId,
  parseUpdateTimelineEventForm,
} from "@/lib/timeline-validation";

function form(entries: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    data.set(key, value);
  }
  return data;
}

describe("isManualTimelineType", () => {
  it("herkent handmatige types", () => {
    expect(isManualTimelineType("NOTE")).toBe(true);
    expect(isManualTimelineType("CALL")).toBe(true);
    expect(isManualTimelineType("STAGE_CHANGE")).toBe(false);
    expect(isManualTimelineType("SYSTEM")).toBe(false);
  });
});

describe("parseTimelineEventForm", () => {
  it("accepteert een notitie bij een lead", () => {
    expect(
      parseTimelineEventForm(
        form({ type: "NOTE", body: "Gebeld", dealId: "deal-1" }),
      ),
    ).toMatchObject({
      type: "NOTE",
      body: "Gebeld",
      dealId: "deal-1",
      followUp: undefined,
    });
  });

  it("sanitizet opgemaakte toelichting", () => {
    expect(
      parseTimelineEventForm(
        form({
          type: "NOTE",
          body: '<b onclick="alert(1)">Hi</b><script>x</script>',
          dealId: "deal-1",
        }),
      ).body,
    ).toBe("<b>Hi</b>");
  });

  it("weigert een gebeurtenis zonder koppeling", () => {
    expect(() =>
      parseTimelineEventForm(form({ type: "NOTE", body: "Los" })),
    ).toThrow(AppError);
  });

  it("zet een ingevulde datum in Amsterdamse tijd", () => {
    expect(
      parseTimelineEventForm(
        form({
          type: "CALL",
          dealId: "deal-1",
          occurredDate: "2026-09-13",
          occurredTime: "09:00",
        }),
      ).occurredAt?.toISOString(),
    ).toBe("2026-09-13T07:00:00.000Z");
  });

  it("plant een vervolgactie als er een datum is", () => {
    const parsed = parseTimelineEventForm(
      form({
        type: "CALL",
        dealId: "deal-1",
        followUpKind: "FOLLOW_UP",
        followUpTitle: "Prospect opvolgen",
        followUpDate: "2026-09-13",
        followUpTime: "09:00",
      }),
    );
    expect(parsed.followUp).toMatchObject({
      kind: "FOLLOW_UP",
      title: "Prospect opvolgen",
      dueDateOnly: false,
    });
    expect(parsed.followUp?.dueAt.toISOString()).toBe("2026-09-13T07:00:00.000Z");
  });

  it("plant een datum-only vervolgactie", () => {
    const parsed = parseTimelineEventForm(
      form({
        type: "CALL",
        dealId: "deal-1",
        followUpDate: "2026-09-13",
        followUpDateOnly: "on",
      }),
    );
    expect(parsed.followUp?.dueDateOnly).toBe(true);
    expect(parsed.followUp?.dueAt.toISOString()).toBe("2026-09-12T22:00:00.000Z");
  });

  it("eist een datum als de titel van de vervolgactie is gewijzigd", () => {
    expect(() =>
      parseTimelineEventForm(
        form({
          type: "CALL",
          dealId: "deal-1",
          followUpTitle: "Offerte nazenden",
        }),
      ),
    ).toThrow(AppError);
  });
});

describe("parseUpdateTimelineEventForm", () => {
  it("leest type en toelichting", () => {
    expect(
      parseUpdateTimelineEventForm(
        form({ id: "evt-1", type: "CALL", body: "Teruggebeld" }),
      ),
    ).toEqual({
      id: "evt-1",
      type: "CALL",
      body: "Teruggebeld",
    });
  });

  it("weigert een systeemtype", () => {
    expect(() =>
      parseUpdateTimelineEventForm(
        form({ id: "evt-1", type: "STAGE_CHANGE", body: "Fase" }),
      ),
    ).toThrow(AppError);
  });

  it("eist een id", () => {
    expect(() =>
      parseUpdateTimelineEventForm(form({ type: "NOTE", body: "Tekst" })),
    ).toThrow(AppError);
  });
});

describe("parseTimelineEventId", () => {
  it("leest het id", () => {
    expect(parseTimelineEventId(form({ id: "evt-1" }))).toBe("evt-1");
  });

  it("weigert een leeg id", () => {
    expect(() => parseTimelineEventId(form({ id: "  " }))).toThrow(AppError);
  });
});
