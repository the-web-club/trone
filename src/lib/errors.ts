export class AppError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, code = "APP_ERROR", status = 400) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function toActionError(error: unknown): { error: string } {
  if (isAppError(error)) {
    return { error: error.message };
  }
  return { error: "Er ging iets mis. Probeer het opnieuw." };
}
