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
