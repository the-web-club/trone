import { describe, expect, it } from "vitest";
import { measuredBottomNavHeightPx } from "@/components/shell/mobile-bottom-nav-height";

describe("measuredBottomNavHeightPx", () => {
  it("stores the outer height in pixels", () => {
    expect(measuredBottomNavHeightPx(65)).toBe("65px");
    expect(measuredBottomNavHeightPx(65.4)).toBe("65.4px");
  });

  it("does not go below zero", () => {
    expect(measuredBottomNavHeightPx(-1)).toBe("0px");
  });
});
