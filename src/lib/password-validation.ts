export const MIN_PASSWORD_LENGTH = 5;
export const MAX_PASSWORD_LENGTH = 128;

export type PasswordRuleId = "length" | "letter" | "number" | "match";

export type PasswordRule = {
  id: PasswordRuleId;
  label: string;
  met: boolean;
};

const hasLetter = /[\p{L}]/u;
const hasNumber = /[\p{N}]/u;

export function getPasswordRules(
  password: string,
  confirm?: string,
): PasswordRule[] {
  const tooLong = password.length > MAX_PASSWORD_LENGTH;
  const rules: PasswordRule[] = [
    {
      id: "length",
      label: tooLong
        ? `Maximaal ${MAX_PASSWORD_LENGTH} tekens`
        : `Minimaal ${MIN_PASSWORD_LENGTH} tekens`,
      met:
        password.length >= MIN_PASSWORD_LENGTH &&
        password.length <= MAX_PASSWORD_LENGTH,
    },
    {
      id: "letter",
      label: "Minimaal 1 letter",
      met: hasLetter.test(password),
    },
    {
      id: "number",
      label: "Minimaal 1 cijfer",
      met: hasNumber.test(password),
    },
  ];

  if (confirm !== undefined) {
    rules.push({
      id: "match",
      label: "Wachtwoorden komen overeen",
      met: password.length > 0 && password === confirm,
    });
  }

  return rules;
}

export function isPasswordValid(password: string, confirm?: string): boolean {
  return getPasswordRules(password, confirm).every((rule) => rule.met);
}

export function passwordValidationMessage(
  password: string,
  confirm?: string,
): string | null {
  const unmet = getPasswordRules(password, confirm).find((rule) => !rule.met);
  if (!unmet) return null;
  switch (unmet.id) {
    case "length":
      return password.length > MAX_PASSWORD_LENGTH
        ? `Gebruik maximaal ${MAX_PASSWORD_LENGTH} tekens.`
        : `Gebruik minimaal ${MIN_PASSWORD_LENGTH} tekens.`;
    case "letter":
      return "Voeg minimaal 1 letter toe.";
    case "number":
      return "Voeg minimaal 1 cijfer toe.";
    case "match":
      return "De wachtwoorden komen niet overeen.";
  }
}

export function passwordApiErrorMessage(code: string | undefined): string {
  switch (code) {
    case "INVALID_TOKEN":
      return "Deze link is ongeldig of verlopen.";
    case "PASSWORD_TOO_SHORT":
      return `Gebruik minimaal ${MIN_PASSWORD_LENGTH} tekens.`;
    case "PASSWORD_TOO_LONG":
      return `Gebruik maximaal ${MAX_PASSWORD_LENGTH} tekens.`;
    default:
      return "Wachtwoord instellen is mislukt. Probeer het opnieuw.";
  }
}
