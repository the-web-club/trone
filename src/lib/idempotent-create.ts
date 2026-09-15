import { AppError } from "@/lib/errors";
import { isSubmissionId } from "@/lib/form-submission";

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === "P2002"
  );
}

export async function createWithSubmissionId<T>(options: {
  submissionId?: string;
  findExisting: (submissionId: string) => Promise<T | null>;
  matches: (existing: T) => boolean;
  create: () => Promise<T>;
}): Promise<T> {
  const submissionId = options.submissionId?.trim() || undefined;
  if (submissionId && !isSubmissionId(submissionId)) {
    throw new AppError(
      "Ongeldige indiening. Ververs de pagina en probeer opnieuw.",
      "VALIDATION",
    );
  }

  if (submissionId) {
    const existing = await options.findExisting(submissionId);
    if (existing) {
      if (!options.matches(existing)) {
        throw new AppError(
          "Deze indiening hoort bij andere gegevens. Ververs de pagina en probeer opnieuw.",
          "CONFLICT",
          409,
        );
      }
      return existing;
    }
  }

  try {
    return await options.create();
  } catch (error) {
    if (submissionId && isUniqueConstraintError(error)) {
      const existing = await options.findExisting(submissionId);
      if (existing) {
        if (!options.matches(existing)) {
          throw new AppError(
            "Deze indiening hoort bij andere gegevens. Ververs de pagina en probeer opnieuw.",
            "CONFLICT",
            409,
          );
        }
        return existing;
      }
    }
    throw error;
  }
}
