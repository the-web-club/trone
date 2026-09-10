import { describe, expect, it } from "vitest";
import {
  captureResetPassword,
  withResetPasswordCapture,
} from "@/lib/mail-capture";

describe("reset password capture", () => {
  it("laat de normale send-path ongemoeid buiten een capture", () => {
    expect(
      captureResetPassword({
        name: "Anna",
        email: "anna@example.com",
        url: "https://www.troneseating.app/x",
      }),
    ).toBe(false);
  });

  it("legt de reset-mail vast zodat de caller zelf kan versturen", async () => {
    const { captured, result } = await withResetPasswordCapture(async () => {
      const stored = captureResetPassword({
        name: "Anna",
        email: "anna@example.com",
        url: "https://www.troneseating.app/x",
      });
      expect(stored).toBe(true);
      return "ok";
    });

    expect(result).toBe("ok");
    expect(captured).toEqual({
      name: "Anna",
      email: "anna@example.com",
      url: "https://www.troneseating.app/x",
    });
  });
});
