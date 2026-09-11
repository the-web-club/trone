import { AppError } from "@/lib/errors";

export const LEAD_SCORE_MAX = 100;

export const LEAD_SCORE_CATEGORY_BOUNDS = {
  high: { min: 75, max: 100 },
  medium: { min: 40, max: 74 },
  low: { min: 0, max: 39 },
} as const;

export const LEAD_SCORE_UNKNOWN_KEY = "unknown" as const;
export const LEAD_SCORE_UNKNOWN_LABEL = "Onbekend";

export const LEAD_SCORE_QUESTION_IDS = [
  "fit",
  "need",
  "intent",
  "decision",
  "timing",
] as const;

export type LeadScoreQuestionId = (typeof LEAD_SCORE_QUESTION_IDS)[number];

export const LEAD_SCORE_QUESTION_COUNT = LEAD_SCORE_QUESTION_IDS.length;

export const LEAD_SCORE_QUESTION_FIELDS = {
  fit: "qualFit",
  need: "qualNeed",
  intent: "qualIntent",
  decision: "qualDecision",
  timing: "qualTiming",
} as const satisfies Record<LeadScoreQuestionId, string>;

export type LeadScoreQuestionField =
  (typeof LEAD_SCORE_QUESTION_FIELDS)[LeadScoreQuestionId];

export type LeadScoreAnswerOption = {
  key: string;
  label: string;
  points: number;
  noMatch?: boolean;
};

export type LeadScoreQuestion = {
  id: LeadScoreQuestionId;
  field: LeadScoreQuestionField;
  question: string;
  options: readonly LeadScoreAnswerOption[];
};

export const LEAD_SCORE_QUESTIONS = [
  {
    id: "fit",
    field: "qualFit",
    question: "Past een TRÔNE-oplossing bij deze toepassing?",
    options: [
      {
        key: "no_fit",
        label: "Geen passende toepassing",
        points: 0,
        noMatch: true,
      },
      {
        key: "possible",
        label: "Mogelijk passend, nog te bevestigen",
        points: 10,
      },
      {
        key: "confirmed",
        label: "Passende toepassing bevestigd",
        points: 20,
      },
    ],
  },
  {
    id: "need",
    field: "qualNeed",
    question: "Hoe concreet is de aankoopbehoefte?",
    options: [
      { key: "none", label: "Geen concrete behoefte", points: 0 },
      {
        key: "named",
        label: "Behoefte benoemd, nog te verifiëren",
        points: 10,
      },
      {
        key: "confirmed",
        label: "Concrete aankoopreden bevestigd",
        points: 20,
      },
    ],
  },
  {
    id: "intent",
    field: "qualIntent",
    question: "Welke koopintentie heeft de klant getoond?",
    options: [
      { key: "none", label: "Geen concreet koopsignaal", points: 0 },
      { key: "exploring", label: "Oriënterende productvragen", points: 5 },
      {
        key: "trial_quote",
        label: "Concrete proefplaatsing of offerte aangevraagd",
        points: 15,
      },
      {
        key: "active_eval",
        label: "Actieve evaluatie of inhoudelijke offertebespreking",
        points: 20,
      },
      {
        key: "confirmed_next",
        label: "Koopintentie bevestigd met concrete vervolgstap",
        points: 30,
      },
    ],
  },
  {
    id: "decision",
    field: "qualDecision",
    question: "Hoe duidelijk is de besluitvorming?",
    options: [
      { key: "none", label: "Geen toegang tot besluitvorming", points: 0 },
      {
        key: "route_known",
        label: "Contactpersoon kent de beslisroute",
        points: 5,
      },
      { key: "identified", label: "Beslisser geïdentificeerd", points: 10 },
      { key: "involved", label: "Beslisser actief betrokken", points: 15 },
    ],
  },
  {
    id: "timing",
    field: "qualTiming",
    question: "Wanneer verwacht de klant te beslissen?",
    options: [
      { key: "none", label: "Geen concrete planning", points: 0 },
      { key: "over_6m", label: "Over meer dan 6 maanden", points: 5 },
      {
        key: "from_3_to_6m",
        label: "Over meer dan 3 tot en met 6 maanden",
        points: 10,
      },
      { key: "within_3m", label: "Binnen 3 maanden", points: 15 },
    ],
  },
] as const satisfies readonly LeadScoreQuestion[];

export const LEAD_SCORE_FILTERS = [
  "hoog",
  "middel",
  "laag",
  "niet-beoordeeld",
  "onvolledig",
  "geen-match",
] as const;

export type LeadScoreFilter = (typeof LEAD_SCORE_FILTERS)[number];

export type LeadScoreAnswers = Record<LeadScoreQuestionId, string | null>;

export type LeadScoreAnswerFields = {
  qualFit: string | null;
  qualNeed: string | null;
  qualIntent: string | null;
  qualDecision: string | null;
  qualTiming: string | null;
};

export type LeadScoreDisplayCategory =
  | "high"
  | "medium"
  | "low"
  | "unassessed"
  | "no_match";

export type LeadScoreBreakdownItem = {
  questionId: LeadScoreQuestionId;
  question: string;
  answerKey: string | null;
  answerLabel: string;
  points: number | null;
  assessed: boolean;
};

export type LeadScoreResult = {
  score: number | null;
  assessedCount: number;
  totalQuestions: number;
  isComplete: boolean;
  isNoMatch: boolean;
  category: LeadScoreDisplayCategory;
  breakdown: LeadScoreBreakdownItem[];
};

export type LeadScoreDerivedFields = {
  leadScore: number | null;
  leadScoreAssessed: number;
  leadScoreNoMatch: boolean;
  leadScoreSort: number;
};

export type LeadScoreWhereInput = {
  leadScoreNoMatch?: boolean;
  leadScore?: { gte: number; lte: number } | null;
  leadScoreAssessed?: { gte: number; lte: number };
};

const questionById = new Map<LeadScoreQuestionId, LeadScoreQuestion>(
  LEAD_SCORE_QUESTIONS.map((question) => [question.id, question]),
);

export function emptyLeadScoreAnswers(): LeadScoreAnswers {
  return {
    fit: null,
    need: null,
    intent: null,
    decision: null,
    timing: null,
  };
}

export function isLeadScoreQuestionId(
  value: string,
): value is LeadScoreQuestionId {
  return (LEAD_SCORE_QUESTION_IDS as readonly string[]).includes(value);
}

export function getLeadScoreQuestion(
  id: string,
): LeadScoreQuestion | undefined {
  if (!isLeadScoreQuestionId(id)) return undefined;
  return questionById.get(id);
}

export function leadScoreOptionByKey(
  question: LeadScoreQuestion,
  key: string | null | undefined,
): LeadScoreAnswerOption | null {
  if (!key) return null;
  return question.options.find((option) => option.key === key) ?? null;
}

export function parseLeadScoreAnswer(
  questionId: string,
  value: string | null | undefined,
): string | null {
  const question = getLeadScoreQuestion(questionId);
  if (!question) {
    throw new AppError("Onbekende kwalificatievraag.", "VALIDATION");
  }
  if (value == null) return null;
  const trimmed = value.trim();
  if (
    trimmed === "" ||
    trimmed === LEAD_SCORE_UNKNOWN_KEY ||
    trimmed === "__none__"
  ) {
    return null;
  }
  if (!leadScoreOptionByKey(question, trimmed)) {
    throw new AppError(
      "Ongeldig antwoord voor deze kwalificatievraag.",
      "VALIDATION",
    );
  }
  return trimmed;
}

export function leadScoreAnswersFromFields(
  fields: LeadScoreAnswerFields,
): LeadScoreAnswers {
  return {
    fit: leadScoreOptionByKey(questionById.get("fit")!, fields.qualFit)?.key ?? null,
    need:
      leadScoreOptionByKey(questionById.get("need")!, fields.qualNeed)?.key ??
      null,
    intent:
      leadScoreOptionByKey(questionById.get("intent")!, fields.qualIntent)
        ?.key ?? null,
    decision:
      leadScoreOptionByKey(questionById.get("decision")!, fields.qualDecision)
        ?.key ?? null,
    timing:
      leadScoreOptionByKey(questionById.get("timing")!, fields.qualTiming)
        ?.key ?? null,
  };
}

export function calculateLeadScore(
  answers: LeadScoreAnswers,
): LeadScoreResult {
  const breakdown: LeadScoreBreakdownItem[] = [];
  let score = 0;
  let assessedCount = 0;
  let isNoMatch = false;

  for (const question of LEAD_SCORE_QUESTIONS) {
    const answerKey = answers[question.id] ?? null;
    const option = leadScoreOptionByKey(question, answerKey);
    if (!option) {
      breakdown.push({
        questionId: question.id,
        question: question.question,
        answerKey: null,
        answerLabel: LEAD_SCORE_UNKNOWN_LABEL,
        points: null,
        assessed: false,
      });
      continue;
    }

    assessedCount += 1;
    score += option.points;
    if (option.noMatch) isNoMatch = true;
    breakdown.push({
      questionId: question.id,
      question: question.question,
      answerKey: option.key,
      answerLabel: option.label,
      points: option.points,
      assessed: true,
    });
  }

  const unassessed = assessedCount === 0;
  const category: LeadScoreDisplayCategory = unassessed
    ? "unassessed"
    : isNoMatch
      ? "no_match"
      : scoreCategoryForPoints(score);

  return {
    score: unassessed ? null : score,
    assessedCount,
    totalQuestions: LEAD_SCORE_QUESTION_COUNT,
    isComplete: assessedCount === LEAD_SCORE_QUESTION_COUNT,
    isNoMatch,
    category,
    breakdown,
  };
}

export function leadScoreFromDeal(
  fields: LeadScoreAnswerFields,
): LeadScoreResult {
  return calculateLeadScore(leadScoreAnswersFromFields(fields));
}

export function leadScoreDerivedFields(
  result: LeadScoreResult,
): LeadScoreDerivedFields {
  return {
    leadScore: result.score,
    leadScoreAssessed: result.assessedCount,
    leadScoreNoMatch: result.isNoMatch,
    leadScoreSort:
      result.score == null || result.isNoMatch ? -1 : result.score,
  };
}

export function scoreCategoryForPoints(
  score: number,
): Exclude<LeadScoreDisplayCategory, "unassessed" | "no_match"> {
  if (score >= LEAD_SCORE_CATEGORY_BOUNDS.high.min) return "high";
  if (score >= LEAD_SCORE_CATEGORY_BOUNDS.medium.min) return "medium";
  return "low";
}

export function leadScoreCategoryLabel(
  category: LeadScoreDisplayCategory,
): string {
  switch (category) {
    case "high":
      return "Hoog";
    case "medium":
      return "Middel";
    case "low":
      return "Laag";
    case "unassessed":
      return "Niet beoordeeld";
    case "no_match":
      return "Geen match";
  }
}

export function leadScoreFractionLabel(result: LeadScoreResult): string | null {
  if (result.score == null) return null;
  return `${result.score}/${LEAD_SCORE_MAX}`;
}

export function leadScoreCompletenessLabel(result: LeadScoreResult): string {
  return `${result.assessedCount}/${result.totalQuestions} beoordeeld`;
}

export function parseLeadScoreFilter(
  value: string | null | undefined,
): LeadScoreFilter | "" {
  const normalized = value?.trim().toLowerCase() ?? "";
  if ((LEAD_SCORE_FILTERS as readonly string[]).includes(normalized)) {
    return normalized as LeadScoreFilter;
  }
  return "";
}

export function leadScoreFilterLabel(filter: LeadScoreFilter): string {
  switch (filter) {
    case "hoog":
      return "Hoog, 75–100";
    case "middel":
      return "Middel, 40–74";
    case "laag":
      return "Laag, 0–39";
    case "niet-beoordeeld":
      return "Niet beoordeeld";
    case "onvolledig":
      return "Onvolledig beoordeeld, 1–4 vragen";
    case "geen-match":
      return "Geen match";
  }
}

export function leadScoreFilterWhereInput(
  filter: LeadScoreFilter,
): LeadScoreWhereInput {
  switch (filter) {
    case "hoog":
      return {
        leadScoreNoMatch: false,
        leadScore: {
          gte: LEAD_SCORE_CATEGORY_BOUNDS.high.min,
          lte: LEAD_SCORE_CATEGORY_BOUNDS.high.max,
        },
      };
    case "middel":
      return {
        leadScoreNoMatch: false,
        leadScore: {
          gte: LEAD_SCORE_CATEGORY_BOUNDS.medium.min,
          lte: LEAD_SCORE_CATEGORY_BOUNDS.medium.max,
        },
      };
    case "laag":
      return {
        leadScoreNoMatch: false,
        leadScore: {
          gte: LEAD_SCORE_CATEGORY_BOUNDS.low.min,
          lte: LEAD_SCORE_CATEGORY_BOUNDS.low.max,
        },
      };
    case "niet-beoordeeld":
      return { leadScore: null };
    case "onvolledig":
      return {
        leadScoreAssessed: { gte: 1, lte: LEAD_SCORE_QUESTION_COUNT - 1 },
      };
    case "geen-match":
      return { leadScoreNoMatch: true };
  }
}

export function leadScoreMatchesFilter(
  snapshot: {
    score: number | null;
    assessedCount: number;
    isNoMatch: boolean;
  },
  filter: LeadScoreFilter,
): boolean {
  switch (filter) {
    case "hoog":
      return (
        !snapshot.isNoMatch &&
        snapshot.score != null &&
        snapshot.score >= LEAD_SCORE_CATEGORY_BOUNDS.high.min &&
        snapshot.score <= LEAD_SCORE_CATEGORY_BOUNDS.high.max
      );
    case "middel":
      return (
        !snapshot.isNoMatch &&
        snapshot.score != null &&
        snapshot.score >= LEAD_SCORE_CATEGORY_BOUNDS.medium.min &&
        snapshot.score <= LEAD_SCORE_CATEGORY_BOUNDS.medium.max
      );
    case "laag":
      return (
        !snapshot.isNoMatch &&
        snapshot.score != null &&
        snapshot.score >= LEAD_SCORE_CATEGORY_BOUNDS.low.min &&
        snapshot.score <= LEAD_SCORE_CATEGORY_BOUNDS.low.max
      );
    case "niet-beoordeeld":
      return snapshot.score == null;
    case "onvolledig":
      return (
        snapshot.assessedCount >= 1 &&
        snapshot.assessedCount <= LEAD_SCORE_QUESTION_COUNT - 1
      );
    case "geen-match":
      return snapshot.isNoMatch;
  }
}

export function maxLeadScoreAnswers(): LeadScoreAnswers {
  return {
    fit: "confirmed",
    need: "confirmed",
    intent: "confirmed_next",
    decision: "involved",
    timing: "within_3m",
  };
}
