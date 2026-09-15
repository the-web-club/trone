import type { DealFieldErrors } from "@/lib/deal-validation";
import { AppError } from "@/lib/errors";

const SUBMISSION_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const LEAD_SAVE_UNCERTAIN_MESSAGE =
  "De opslag is niet bevestigd. De lead is mogelijk al aangemaakt. Probeer opnieuw — er wordt geen extra lead aangemaakt.";

export function isSubmissionId(value: string): boolean {
  return SUBMISSION_ID_RE.test(value);
}

export function createSubmissionId(): string {
  return crypto.randomUUID();
}

export function parseDealSubmissionId(value: unknown): string {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!isSubmissionId(raw)) {
    throw new AppError(
      "Ongeldige indiening. Ververs de pagina en probeer opnieuw.",
      "VALIDATION",
    );
  }
  return raw;
}

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

export type LeadSaveResult<TDeal> = {
  error?: string;
  fieldErrors?: DealFieldErrors;
  deal?: TDeal;
};

export type LeadSubmitClientResult<TDeal> =
  | { status: "ignored" }
  | { status: "invalid"; fieldErrors: DealFieldErrors; formError: string }
  | { status: "failed"; error: string; fieldErrors?: DealFieldErrors }
  | { status: "uncertain"; error: string }
  | { status: "success"; deal: TDeal };

export async function submitLeadCreation<TDeal>(options: {
  guard: SubmissionGuard;
  formData: FormData;
  validate: (
    formData: FormData,
  ) =>
    | { success: true }
    | { success: false; fieldErrors: DealFieldErrors; formError: string };
  save: (formData: FormData) => Promise<LeadSaveResult<TDeal>>;
  onStart?: () => void;
}): Promise<LeadSubmitClientResult<TDeal>> {
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
    const result = await options.save(options.formData);
    if (result.error || !result.deal) {
      options.guard.release();
      return {
        status: "failed",
        error: result.error ?? "Er ging iets mis. Probeer het opnieuw.",
        fieldErrors: result.fieldErrors,
      };
    }
    options.guard.markSucceeded();
    return { status: "success", deal: result.deal };
  } catch {
    options.guard.release();
    return { status: "uncertain", error: LEAD_SAVE_UNCERTAIN_MESSAGE };
  }
}

export function visibleDealFieldErrors(
  errors: DealFieldErrors,
  touched: Partial<Record<string, boolean>>,
  submitted: boolean,
): DealFieldErrors {
  if (submitted) return errors;
  const visible: DealFieldErrors = {};
  for (const [key, message] of Object.entries(errors)) {
    if (message && touched[key]) {
      visible[key as keyof DealFieldErrors] = message;
    }
  }
  return visible;
}

export function refreshAfterSuccess(refresh: () => void): void {
  try {
    refresh();
  } catch {
    refresh();
  }
}
