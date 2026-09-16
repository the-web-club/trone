export class AppError extends Error {
  readonly code: string;
  readonly status: number;
  readonly fieldErrors?: Record<string, string>;

  constructor(
    message: string,
    code = "APP_ERROR",
    status = 400,
    fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/** Leesbare samenvatting van een onbekende fout. */
export type ErrorDescription = {
  soort: string;
  melding: string;
  code: string | null;
};

/**
 * Haalt het codefragment uit een foutmelding van meerdere regels.
 *
 * Prisma zet de echte databasefout ónder een uitgeschreven stuk broncode van de
 * aanroep, inclusief pad naar de bibliotheek. In een metadataveld van 256
 * tekens is dat fataal: het fragment vult de ruimte en duwt juist de reden
 * eruit. Wat na het filteren overblijft is de melding zelf.
 */
function compactMessage(message: string): string {
  const lines = message.split("\n");
  if (lines.length === 1) return message.trim();

  const kept = lines.filter((line) => {
    const trimmed = line.trim();
    if (!trimmed) return false;
    if (/^(→\s*)?\d+\s/.test(trimmed)) return false;
    if (trimmed.includes("node_modules")) return false;
    return true;
  });

  return (kept.length > 0 ? kept : lines).join(" ").replace(/\s+/g, " ").trim();
}

/**
 * Beschrijft een fout van onbekende herkomst voor het audit-log en de
 * serverconsole. Geen stacktrace: daar staan query- en gebruikersgegevens in.
 *
 * `code` haalt het losse codeveld op dat elke laag op zijn eigen manier
 * meestuurt: Prisma zet er `P2024` in, de MariaDB-driver een `ER_`-constante en
 * een gesneuvelde socket een numerieke `errno` naast `ECONNRESET`. Juist die
 * code maakt het verschil tussen "database was even weg" en "query was fout".
 */
export function describeError(error: unknown): ErrorDescription {
  if (!(error instanceof Error)) {
    return { soort: typeof error, melding: String(error), code: null };
  }

  const { code, errno } = error as { code?: unknown; errno?: unknown };
  const resolved =
    typeof code === "string" || typeof code === "number"
      ? String(code)
      : typeof errno === "number"
        ? String(errno)
        : null;

  return {
    soort: error.name || "Error",
    melding: compactMessage(error.message),
    code: resolved,
  };
}

export type ActionError = {
  error: string;
  code?: string;
  fieldErrors?: Record<string, string>;
};

export function toActionError(error: unknown): ActionError {
  if (isAppError(error)) {
    return {
      error: error.message,
      code: error.code,
      fieldErrors: error.fieldErrors,
    };
  }
  return { error: "Er ging iets mis. Probeer het opnieuw." };
}
