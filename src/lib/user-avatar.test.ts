import { describe, expect, it } from "vitest";
import { initialsFromName } from "@/lib/format";
import { parseUpdateUserImageForm } from "@/lib/user-validation";

describe("initialsFromName", () => {
  it("uses first and last initial", () => {
    expect(initialsFromName("Frederik Derks")).toBe("FD");
    expect(initialsFromName("Anna van Berg")).toBe("AB");
  });

  it("falls back for single names and empty input", () => {
    expect(initialsFromName("Rik")).toBe("RI");
    expect(initialsFromName("   ")).toBe("?");
  });
});

describe("parseUpdateUserImageForm", () => {
  it("reads user id and remove flag", () => {
    const form = new FormData();
    form.set("userId", "user-1");
    form.set("remove", "true");
    expect(parseUpdateUserImageForm(form)).toEqual({
      userId: "user-1",
      remove: true,
    });
  });
});
