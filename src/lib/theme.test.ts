import { describe, expect, it } from "vitest";
import {
  DEFAULT_THEME_PREFERENCE,
  parseResolvedTheme,
  parseThemePreference,
  resolveTheme,
  themePreferenceFromUser,
  themePreferenceOrDefault,
} from "@/lib/theme";

describe("theme preference", () => {
  it("defaults to systeem when nothing is stored", () => {
    expect(themePreferenceOrDefault(undefined)).toBe(DEFAULT_THEME_PREFERENCE);
    expect(themePreferenceOrDefault(null)).toBe("system");
    expect(themePreferenceOrDefault("")).toBe("system");
    expect(themePreferenceOrDefault("nope")).toBe("system");
  });

  it("accepts only licht, donker and systeem values", () => {
    expect(parseThemePreference("light")).toBe("light");
    expect(parseThemePreference("dark")).toBe("dark");
    expect(parseThemePreference("system")).toBe("system");
    expect(parseThemePreference("Dark")).toBeNull();
    expect(parseThemePreference(1)).toBeNull();
  });

  it("reads the stored account preference", () => {
    expect(themePreferenceFromUser({ themePreference: "dark" })).toBe("dark");
    expect(themePreferenceFromUser({ themePreference: "invalid" })).toBeNull();
    expect(themePreferenceFromUser(null)).toBeNull();
  });

  it("resolves systeem against the operating-system theme", () => {
    expect(resolveTheme("light", "dark")).toBe("light");
    expect(resolveTheme("dark", "light")).toBe("dark");
    expect(resolveTheme("system", "dark")).toBe("dark");
    expect(resolveTheme("system", "light")).toBe("light");
    expect(resolveTheme("system", null)).toBeNull();
  });

  it("parses the resolved cookie", () => {
    expect(parseResolvedTheme("dark")).toBe("dark");
    expect(parseResolvedTheme("light")).toBe("light");
    expect(parseResolvedTheme("system")).toBeNull();
  });
});
