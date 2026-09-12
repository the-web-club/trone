"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addFeatureRequestCommentAction,
  type FeatureRequestCommentActionResult,
} from "@/app/(beveiligd)/actions/feature-request-actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FEATURE_REQUEST_COMMENT_MAX } from "@/lib/feature-request-validation";

export function FeatureRequestCommentForm({
  requestId,
  onCreated,
}: {
  requestId: string;
  onCreated?: (comment: NonNullable<FeatureRequestCommentActionResult["comment"]>) => void;
}) {
  const router = useRouter();
  const fieldId = useId();
  const [body, setBody] = useState("");
  const [state, formAction, pending] = useActionState(
    addFeatureRequestCommentAction,
    null,
  );
  const notifiedAt = useRef<number | null>(null);

  useEffect(() => {
    if (!state?.createdAt || notifiedAt.current === state.createdAt) return;
    notifiedAt.current = state.createdAt;
    setBody("");
    if (state.comment) onCreated?.(state.comment);
    router.refresh();
  }, [state?.createdAt, state?.comment, onCreated, router]);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="requestId" value={requestId} />
      <label htmlFor={fieldId} className="sr-only">
        Reactie
      </label>
      <Textarea
        id={fieldId}
        name="body"
        required
        maxLength={FEATURE_REQUEST_COMMENT_MAX}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder="Schrijf een reactie…"
        className="min-h-20"
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-fg-subtle tabular-nums">
          {body.trim().length}/{FEATURE_REQUEST_COMMENT_MAX}
        </span>
        <Button
          type="submit"
          loading={pending}
          disabled={pending || !body.trim()}
        >
          Plaats reactie
        </Button>
      </div>
      {state?.error ? (
        <p className="text-sm text-danger" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
