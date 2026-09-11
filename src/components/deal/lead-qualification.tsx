"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { patchDealQualificationAction } from "@/app/(beveiligd)/actions/deal-actions";
import { DetailSection } from "@/components/detail/detail-layout";
import {
  INLINE_SELECT_EMPTY,
  InlineSelectField,
} from "@/components/detail/inline-select-field";
import { LeadScoreView } from "@/components/deal/lead-score-view";
import type { SelectOption } from "@/components/ui/select";
import {
  calculateLeadScore,
  LEAD_SCORE_QUESTIONS,
  LEAD_SCORE_UNKNOWN_LABEL,
  type LeadScoreAnswers,
  type LeadScoreQuestionId,
} from "@/lib/lead-score";

export type LeadQualificationAnswers = LeadScoreAnswers;

export function LeadQualification({
  dealId,
  answers: answersFromServer,
  canEdit = true,
}: {
  dealId: string;
  answers: LeadScoreAnswers;
  canEdit?: boolean;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState(answersFromServer);
  const [fromServer, setFromServer] = useState(answersFromServer);
  const queueRef = useRef(Promise.resolve());
  const inflightRef = useRef(0);

  if (answersFromServer !== fromServer) {
    setFromServer(answersFromServer);
    setAnswers(answersFromServer);
  }

  const result = useMemo(() => calculateLeadScore(answers), [answers]);

  function saveAnswer(questionId: LeadScoreQuestionId, next: string) {
    const run = async (): Promise<string | null> => {
      inflightRef.current += 1;
      try {
        const saved = await patchDealQualificationAction(
          dealId,
          questionId,
          next || null,
        );
        if (saved.error) return saved.error;
        if (saved.answers) setAnswers(saved.answers);
        return null;
      } finally {
        inflightRef.current -= 1;
        if (inflightRef.current === 0) router.refresh();
      }
    };

    const done = queueRef.current.then(run, run);
    queueRef.current = done.then(
      () => undefined,
      () => undefined,
    );
    return done;
  }

  return (
    <DetailSection
      title="Leadkwalificatie"
      action={<LeadScoreView result={result} showInfo />}
    >
      <div className="grid min-w-0 grid-cols-1 gap-x-3 gap-y-2 sm:grid-cols-2">
        {LEAD_SCORE_QUESTIONS.map((question) => {
          const value = answers[question.id] ?? "";
          const items: SelectOption[] = [
            { value: INLINE_SELECT_EMPTY, label: LEAD_SCORE_UNKNOWN_LABEL },
            ...question.options.map((option) => ({
              value: option.key,
              label: option.label,
              hint: String(option.points),
            })),
          ];
          const selected =
            question.options.find((option) => option.key === value) ?? null;

          return (
            <div key={question.id} className="min-w-0">
              {canEdit ? (
                <InlineSelectField
                  label={question.question}
                  value={value}
                  items={items}
                  layout="row"
                  searchPlaceholder="Zoek een antwoord…"
                  contentClassName="min-w-[min(24rem,var(--available-width))]"
                  onSave={(next) => saveAnswer(question.id, next)}
                />
              ) : (
                <div className="inline-field flex min-w-0 flex-col gap-0.5">
                  <span className="text-label text-pretty font-medium break-words text-fg-muted">
                    {question.question}
                  </span>
                  <div className="min-h-8 px-1 py-1 text-sm break-words text-fg">
                    {selected?.label ?? LEAD_SCORE_UNKNOWN_LABEL}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </DetailSection>
  );
}
