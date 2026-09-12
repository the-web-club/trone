import { z } from "zod";
import { AppError } from "@/lib/errors";

export const featureRequestTypes = [
  "BUG",
  "FEATURE",
  "UX_DESIGN",
  "IMPROVEMENT",
] as const;
export type FeatureRequestType = (typeof featureRequestTypes)[number];

export const featureRequestStatuses = [
  "OPEN",
  "PLANNED",
  "IN_PROGRESS",
  "DONE",
  "MERGED",
] as const;
export type FeatureRequestStatus = (typeof featureRequestStatuses)[number];

export const ACTIVE_FEATURE_REQUEST_STATUSES: FeatureRequestStatus[] = [
  "OPEN",
  "PLANNED",
  "IN_PROGRESS",
];

export const featureRequestTypeLabels: Record<FeatureRequestType, string> = {
  BUG: "Bug",
  FEATURE: "Feature",
  UX_DESIGN: "UX / Design",
  IMPROVEMENT: "Verbetering",
};

export const featureRequestTypeTones = {
  BUG: "danger",
  FEATURE: "info",
  UX_DESIGN: "warning",
  IMPROVEMENT: "default",
} as const;

export const featureRequestStatusLabels: Record<FeatureRequestStatus, string> = {
  OPEN: "Open",
  PLANNED: "Gepland",
  IN_PROGRESS: "Bezig",
  DONE: "Afgerond",
  MERGED: "Samengevoegd",
};

export const featureRequestStatusTones = {
  OPEN: "info",
  PLANNED: "warning",
  IN_PROGRESS: "warning",
  DONE: "success",
  MERGED: "default",
} as const;

export const FEATURE_REQUEST_TITLE_MAX = 160;
export const FEATURE_REQUEST_DESCRIPTION_MAX = 5000;
export const FEATURE_REQUEST_COMMENT_MAX = 5000;
export const FEATURE_REQUEST_DESCRIPTION_HELP =
  "Wat gaat er mis of wat kan beter? Beschrijf wat je verwacht en waarom dit helpt.";

function emptyToUndefined(value: unknown): unknown {
  if (value == null) return undefined;
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

const featureRequestTypeSchema = z.enum(featureRequestTypes, {
  error: "Kies een type.",
});

const featureRequestStatusSchema = z.enum(featureRequestStatuses, {
  error: "Kies een geldige status.",
});

const createFeatureRequestSchema = z.object({
  type: featureRequestTypeSchema,
  title: z
    .string()
    .trim()
    .min(1, "Titel is verplicht.")
    .max(
      FEATURE_REQUEST_TITLE_MAX,
      `Titel mag maximaal ${FEATURE_REQUEST_TITLE_MAX} tekens zijn.`,
    ),
  description: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .max(
        FEATURE_REQUEST_DESCRIPTION_MAX,
        `Omschrijving mag maximaal ${FEATURE_REQUEST_DESCRIPTION_MAX} tekens zijn.`,
      )
      .optional(),
  ),
});

export type CreateFeatureRequestInput = {
  type: FeatureRequestType;
  title: string;
  description: string | null;
};

export type UpdateFeatureRequestInput = {
  type?: FeatureRequestType;
  title?: string;
  description?: string | null;
};

export function parseCreateFeatureRequestForm(
  formData: FormData,
): CreateFeatureRequestInput {
  const parsed = createFeatureRequestSchema.safeParse({
    type: formData.get("type"),
    title: formData.get("title"),
    description: formData.get("description"),
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    throw new AppError(
      first?.message ?? "Controleer het formulier.",
      "VALIDATION",
    );
  }

  return {
    type: parsed.data.type,
    title: parsed.data.title,
    description: parsed.data.description ?? null,
  };
}

const updateFeatureRequestSchema = z
  .object({
    type: z.preprocess(emptyToUndefined, featureRequestTypeSchema.optional()),
    title: z.preprocess(
      emptyToUndefined,
      z
        .string()
        .trim()
        .min(1, "Titel is verplicht.")
        .max(
          FEATURE_REQUEST_TITLE_MAX,
          `Titel mag maximaal ${FEATURE_REQUEST_TITLE_MAX} tekens zijn.`,
        )
        .optional(),
    ),
    description: z
      .union([
        z.literal(""),
        z
          .string()
          .max(
            FEATURE_REQUEST_DESCRIPTION_MAX,
            `Omschrijving mag maximaal ${FEATURE_REQUEST_DESCRIPTION_MAX} tekens zijn.`,
          ),
      ])
      .optional(),
  })
  .refine(
    (value) =>
      value.type != null || value.title != null || value.description != null,
    { message: "Er is niets om op te slaan." },
  );

export function parseUpdateFeatureRequestInput(input: {
  type?: string | null;
  title?: string | null;
  description?: string | null;
}): UpdateFeatureRequestInput {
  const parsed = updateFeatureRequestSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    throw new AppError(
      first?.message ?? "Controleer het formulier.",
      "VALIDATION",
    );
  }

  return {
    type: parsed.data.type,
    title: parsed.data.title,
    description:
      parsed.data.description === undefined
        ? undefined
        : parsed.data.description.trim() === ""
          ? null
          : parsed.data.description,
  };
}

export function parseFeatureRequestId(formData: FormData, key = "id"): string {
  const parsed = z
    .string()
    .trim()
    .min(1, "Verzoek ontbreekt.")
    .safeParse(formData.get(key));

  if (!parsed.success) {
    throw new AppError("Verzoek ontbreekt.", "VALIDATION");
  }

  return parsed.data;
}

export function parseFeatureRequestStatusValue(
  value: string | null | undefined,
): FeatureRequestStatus {
  const parsed = featureRequestStatusSchema.safeParse(value);
  if (!parsed.success) {
    throw new AppError("Kies een geldige status.", "VALIDATION");
  }
  if (parsed.data === "MERGED") {
    throw new AppError(
      "Gebruik samenvoegen om een verzoek als samengevoegd te markeren.",
      "VALIDATION",
    );
  }
  return parsed.data;
}

const commentSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Reactie mag niet leeg zijn.")
    .max(
      FEATURE_REQUEST_COMMENT_MAX,
      `Reactie mag maximaal ${FEATURE_REQUEST_COMMENT_MAX} tekens zijn.`,
    ),
});

export function parseFeatureRequestCommentForm(formData: FormData): {
  requestId: string;
  body: string;
} {
  const requestId = parseFeatureRequestId(formData, "requestId");
  const parsed = commentSchema.safeParse({ body: formData.get("body") });
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    throw new AppError(
      first?.message ?? "Controleer de reactie.",
      "VALIDATION",
    );
  }
  return { requestId, body: parsed.data.body };
}

export function parseMergeFeatureRequestForm(formData: FormData): {
  sourceId: string;
  targetId: string;
} {
  return {
    sourceId: parseFeatureRequestId(formData, "sourceId"),
    targetId: parseFeatureRequestId(formData, "targetId"),
  };
}

export function validateCreateFeatureRequestFields(input: {
  type: string;
  title: string;
  description: string;
}): Partial<Record<"type" | "title" | "description", string>> {
  const errors: Partial<Record<"type" | "title" | "description", string>> = {};
  if (!featureRequestTypes.includes(input.type as FeatureRequestType)) {
    errors.type = "Kies een type.";
  }
  const title = input.title.trim();
  if (!title) errors.title = "Titel is verplicht.";
  else if (title.length > FEATURE_REQUEST_TITLE_MAX) {
    errors.title = `Titel mag maximaal ${FEATURE_REQUEST_TITLE_MAX} tekens zijn.`;
  }
  if (input.description.length > FEATURE_REQUEST_DESCRIPTION_MAX) {
    errors.description = `Omschrijving mag maximaal ${FEATURE_REQUEST_DESCRIPTION_MAX} tekens zijn.`;
  }
  return errors;
}
