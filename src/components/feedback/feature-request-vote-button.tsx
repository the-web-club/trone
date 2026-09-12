"use client";

import { ChevronUp } from "lucide-react";
import { useEffect, useState } from "react";
import {
  addFeatureRequestVoteAction,
  removeFeatureRequestVoteAction,
} from "@/app/(beveiligd)/actions/feature-request-actions";
import { cn } from "@/lib/cn";
import { focusRingOutline } from "@/components/ui/control-styles";

export function FeatureRequestVoteButton({
  requestId,
  voteCount,
  viewerHasVoted,
  canVote,
  disabledReason,
}: {
  requestId: string;
  voteCount: number;
  viewerHasVoted: boolean;
  canVote: boolean;
  disabledReason?: string;
}) {
  const [voted, setVoted] = useState(viewerHasVoted);
  const [count, setCount] = useState(voteCount);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setVoted(viewerHasVoted);
    setCount(voteCount);
  }, [viewerHasVoted, voteCount]);

  async function toggleVote() {
    if (!canVote || pending) return;
    const previousVoted = voted;
    const previousCount = count;
    const nextVoted = !voted;
    setVoted(nextVoted);
    setCount(nextVoted ? count + 1 : Math.max(count - 1, 0));
    setPending(true);
    setError(null);

    const result = nextVoted
      ? await addFeatureRequestVoteAction(requestId)
      : await removeFeatureRequestVoteAction(requestId);

    setPending(false);
    if (result.error) {
      setVoted(previousVoted);
      setCount(previousCount);
      setError(result.error);
    }
  }

  const label = !canVote
    ? (disabledReason ?? "Stemmen is niet beschikbaar")
    : voted
      ? "Stem intrekken"
      : "Stemmen";

  return (
    <div className="flex shrink-0 flex-col items-center">
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void toggleVote();
        }}
        disabled={!canVote || pending}
        aria-pressed={voted}
        aria-label={label}
        title={label}
        className={cn(
          "inline-flex size-11 flex-col items-center justify-center rounded-sm text-fg-muted",
          focusRingOutline,
          canVote && "hover:bg-hover hover:text-fg",
          voted && "bg-info-bg text-info hover:bg-info-bg hover:text-info",
          (!canVote || pending) && "cursor-not-allowed opacity-70",
        )}
      >
        <ChevronUp className="size-4" strokeWidth={2} aria-hidden />
        <span className="text-xs font-medium tabular-nums" aria-live="polite">
          {count}
        </span>
      </button>
      {error ? (
        <p className="sr-only" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
