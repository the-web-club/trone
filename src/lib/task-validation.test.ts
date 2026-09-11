import { describe, expect, it } from "vitest";
import { AppError } from "@/lib/errors";
import {
  buildFollowUpInput,
  parseCreateFollowUpForm,
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
