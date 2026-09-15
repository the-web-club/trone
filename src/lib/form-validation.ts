import type { z } from "zod";
import { AppError } from "@/lib/errors";
import type { FieldErrors } from "@/lib/form-submission";

export function fieldErrorsFromZod(error: z.ZodError): FieldErrors {
  const fields: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && fields[key] == null) {
      fields[key] = issue.message;
    }
  }
  return fields;
}

export function formInvalidFromZod(error: z.ZodError): {
  success: false;
  fieldErrors: FieldErrors;
  formError: string;
} {
  const fieldErrors = fieldErrorsFromZod(error);
  return {
    success: false,
    fieldErrors,
    formError: error.issues[0]?.message ?? "Controleer het formulier.",
  };
}

export function throwValidationFromZod(error: z.ZodError): never {
  const fieldErrors = fieldErrorsFromZod(error);
  throw new AppError(
    error.issues[0]?.message ?? "Controleer het formulier.",
    "VALIDATION",
    400,
    fieldErrors,
  );
}
