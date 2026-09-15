import { AppError } from "@/lib/errors";

const SUBMISSION_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const UNCERTAIN_SAVE_MESSAGE =
  "De opslag is niet bevestigd. Het record is mogelijk al aangemaakt. Probeer opnieuw — er wordt geen extra record aangemaakt.";

export const LEAD_SAVE_UNCERTAIN_MESSAGE =
  "De opslag is niet bevestigd. De lead is mogelijk al aangemaakt. Probeer opnieuw — er wordt geen extra lead aangemaakt.";

export type FieldErrors = Record<string, string>;

export function isSubmissionId(value: string): boolean {
  return SUBMISSION_ID_RE.test(value);
}

export function createSubmissionId(): string {
  return crypto.randomUUID();
}

export function parseSubmissionId(value: unknown): string {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!isSubmissionId(raw)) {
    throw new AppError(
      "Ongeldige indiening. Ververs de pagina en probeer opnieuw.",
      "VALIDATION",
    );
  }
  return raw;
}

export const parseDealSubmissionId = parseSubmissionId;

export type SubmissionGuard = {
  tryAcquire(): boolean;
  release(): void;
  markSucceeded(): void;
};

export function createSubmissionGuard(): SubmissionGuard {
  let inFlight = false;
  let succeeded = false;

  return {
    tryAcquire() {
      if (inFlight || succeeded) return false;
      inFlight = true;
      return true;
    },
    release() {
      if (!succeeded) inFlight = false;
    },
    markSucceeded() {
      succeeded = true;
      inFlight = false;
    },
  };
}

export type FormSaveResult<TResult> = {
  error?: string;
  fieldErrors?: FieldErrors;
  result?: TResult;
};

export type FormSubmitClientResult<TResult> =
  | { status: "ignored" }
  | { status: "invalid"; fieldErrors: FieldErrors; formError: string }
  | { status: "failed"; error: string; fieldErrors?: FieldErrors }
  | { status: "uncertain"; error: string }
  | { status: "success"; result: TResult };

function isNextRedirect(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    String((error as { digest: string }).digest).startsWith("NEXT_REDIRECT")
  );
}

export async function submitFormAction<TResult>(options: {
  guard: SubmissionGuard;
  formData: FormData;
  validate: (
    formData: FormData,
  ) =>
    | { success: true }
    | { success: false; fieldErrors: FieldErrors; formError: string };
  save: (formData: FormData) => Promise<FormSaveResult<TResult>>;
  onStart?: () => void;
  uncertainMessage?: string;
}): Promise<FormSubmitClientResult<TResult>> {
  if (!options.guard.tryAcquire()) return { status: "ignored" };
  options.onStart?.();

  const parsed = options.validate(options.formData);
  if (!parsed.success) {
    options.guard.release();
    return {
      status: "invalid",
      fieldErrors: parsed.fieldErrors,
      formError: parsed.formError,
    };
  }

  try {
    const saved = await options.save(options.formData);
    if (saved.error || saved.result === undefined) {
      options.guard.release();
      return {
        status: "failed",
        error: saved.error ?? "Er ging iets mis. Probeer het opnieuw.",
        fieldErrors: saved.fieldErrors,
      };
    }
    options.guard.markSucceeded();
    return { status: "success", result: saved.result };
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    options.guard.release();
    return {
      status: "uncertain",
      error: options.uncertainMessage ?? UNCERTAIN_SAVE_MESSAGE,
    };
  }
}

export type LeadSaveResult<TDeal> = {
  error?: string;
  fieldErrors?: FieldErrors;
  deal?: TDeal;
};

export type LeadSubmitClientResult<TDeal> =
  | { status: "ignored" }
  | { status: "invalid"; fieldErrors: FieldErrors; formError: string }
  | { status: "failed"; error: string; fieldErrors?: FieldErrors }
  | { status: "uncertain"; error: string }
  | { status: "success"; deal: TDeal };

export async function submitLeadCreation<TDeal>(options: {
  guard: SubmissionGuard;
  formData: FormData;
  validate: (
    formData: FormData,
  ) =>
    | { success: true }
    | { success: false; fieldErrors: FieldErrors; formError: string };
  save: (formData: FormData) => Promise<LeadSaveResult<TDeal>>;
  onStart?: () => void;
}): Promise<LeadSubmitClientResult<TDeal>> {
  const result = await submitFormAction({
    ...options,
    uncertainMessage: LEAD_SAVE_UNCERTAIN_MESSAGE,
    save: async (formData) => {
      const saved = await options.save(formData);
      return {
        error: saved.error,
        fieldErrors: saved.fieldErrors,
        result: saved.deal,
      };
    },
  });
  if (result.status === "success") {
    return { status: "success", deal: result.result };
  }
  return result;
}

export function visibleFieldErrors(
  errors: FieldErrors,
  touched: Partial<Record<string, boolean>>,
  submitted: boolean,
): FieldErrors {
  if (submitted) return errors;
  const visible: FieldErrors = {};
  for (const [key, message] of Object.entries(errors)) {
    if (message && touched[key]) visible[key] = message;
  }
  return visible;
}

export const visibleDealFieldErrors = visibleFieldErrors;

export function firstInvalidField(
  order: readonly string[],
  errors: FieldErrors,
): string | undefined {
  return order.find((field) => errors[field]);
}

export function refreshAfterSuccess(refresh: () => void): void {
  try {
    refresh();
  } catch {
    refresh();
  }
}

export function requiredField(
  formData: FormData,
  name: string,
  message: string,
): { success: true; value: string } | { success: false; fieldErrors: FieldErrors; formError: string } {
  const value = String(formData.get(name) ?? "").trim();
  if (!value) {
    return {
      success: false,
      fieldErrors: { [name]: message },
      formError: message,
    };
  }
  return { success: true, value };
}
