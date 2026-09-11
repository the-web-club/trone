import { describe, expect, it } from "vitest";
import {
  getPasswordRules,
  isPasswordValid,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  passwordApiErrorMessage,
  passwordValidationMessage,
} from "@/lib/password-validation";

function ruleMet(password: string, confirm: string | undefined, id: string) {
  return getPasswordRules(password, confirm).find((rule) => rule.id === id)?.met;
}

describe("password validation", () => {
  it("wijst te korte wachtwoorden af", () => {
    expect(isPasswordValid("Ab1", "Ab1")).toBe(false);
    expect(ruleMet("Ab1", "Ab1", "length")).toBe(false);
    expect(passwordValidationMessage("Ab1", "Ab1")).toBe(
      `Gebruik minimaal ${MIN_PASSWORD_LENGTH} tekens.`,
    );
  });

  it("vraagt om een letter en een cijfer", () => {
    expect(isPasswordValid("abcde", "abcde")).toBe(false);
    expect(ruleMet("abcde", "abcde", "number")).toBe(false);
    expect(passwordValidationMessage("abcde", "abcde")).toBe(
      "Voeg minimaal 1 cijfer toe.",
    );
    expect(isPasswordValid("12345", "12345")).toBe(false);
    expect(ruleMet("12345", "12345", "letter")).toBe(false);
    expect(passwordValidationMessage("12345", "12345")).toBe(
      "Voeg minimaal 1 letter toe.",
    );
  });

  it("accepteert een geldig wachtwoord dat overeenkomt", () => {
    expect(isPasswordValid("stoel5", "stoel5")).toBe(true);
    expect(passwordValidationMessage("stoel5", "stoel5")).toBeNull();
  });

  it("merkt niet-overeenkomende wachtwoorden", () => {
    expect(isPasswordValid("stoel5", "stoel6")).toBe(false);
    expect(ruleMet("stoel5", "stoel6", "match")).toBe(false);
    expect(passwordValidationMessage("stoel5", "stoel6")).toBe(
      "De wachtwoorden komen niet overeen.",
    );
  });

  it("keurt wachtwoorden boven de maximumlengte af", () => {
    const tooLong = `a1${"x".repeat(MAX_PASSWORD_LENGTH)}`;
    expect(isPasswordValid(tooLong, tooLong)).toBe(false);
    expect(ruleMet(tooLong, tooLong, "length")).toBe(false);
  });

  it("vertaalt API-foutcodes", () => {
    expect(passwordApiErrorMessage("INVALID_TOKEN")).toBe(
      "Deze link is ongeldig of verlopen.",
    );
    expect(passwordApiErrorMessage("PASSWORD_TOO_SHORT")).toContain(
      String(MIN_PASSWORD_LENGTH),
    );
  });
});
