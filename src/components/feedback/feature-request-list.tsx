import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { FeatureRequestVoteButton } from "@/components/feedback/feature-request-vote-button";
import { Badge } from "@/components/ui/badge";
import { UserName } from "@/components/user/user-name";
import type { FeatureRequestListItem } from "@/lib/feature-request-service";
import {
  featureRequestStatusLabels,
  featureRequestStatusTones,
  featureRequestTypeLabels,
  featureRequestTypeTones,
} from "@/lib/feature-request-validation";
import { formatDate } from "@/lib/format";
import { featureRequestPath } from "@/lib/paths";

export function FeatureRequestList({
  items,
  emptyMessage,
  emptyAction,
  canVote,
}: {
  items: FeatureRequestListItem[];
  emptyMessage: React.ReactNode;
  emptyAction?: React.ReactNode;
  canVote: boolean;
}) {
  if (items.length === 0) {
    return (
      <p className="py-6 text-sm text-fg-muted">
        {emptyMessage}
        {emptyAction}
      </p>
    );
  }

  return (
    <ul className="min-w-0 divide-y divide-border overflow-hidden">
      {items.map((item) => (
        <li key={item.id} className="min-w-0">
          <FeatureRequestRow item={item} canVote={canVote} />
        </li>
      ))}
    </ul>
  );
}

function FeatureRequestRow({
  item,
  canVote,
}: {
  item: FeatureRequestListItem;
  canVote: boolean;
}) {
  const href = featureRequestPath(item);
  const merged = item.status === "MERGED";

  return (
    <div className="flex min-w-0 items-start gap-2 py-3 sm:gap-3">
      <FeatureRequestVoteButton
        requestId={item.id}
        voteCount={item.voteCount}
        viewerHasVoted={item.viewerHasVoted}
        canVote={canVote && !merged}
        disabledReason={
          merged
            ? "Op een samengevoegd verzoek kan niet meer worden gestemd."
            : undefined
        }
      />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-start gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <Badge tone={featureRequestTypeTones[item.type]}>
                {featureRequestTypeLabels[item.type]}
              </Badge>
              <Link
                href={href}
                className="min-w-0 text-sm font-medium break-words text-fg hover:underline"
              >
                {item.title}
              </Link>
            </div>
            {item.description ? (
              <p className="mt-1 line-clamp-2 text-sm break-words text-fg-muted">
                {item.description}
              </p>
            ) : null}
          </div>
          <Badge
            tone={featureRequestStatusTones[item.status]}
            className="shrink-0"
          >
            {featureRequestStatusLabels[item.status]}
          </Badge>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-fg-muted sm:flex sm:flex-wrap sm:items-center sm:gap-x-2">
          <UserName
            name={item.author.name}
            image={item.author.image}
            slug={item.author.slug}
            className="min-w-0"
          />
          <time dateTime={item.createdAt.toISOString()} className="truncate">
            {formatDate(item.createdAt)}
          </time>
          {item.commentCount > 0 ? (
            <span className="col-span-2 inline-flex items-center gap-1 sm:col-span-1">
              <MessageSquare className="size-3.5 shrink-0" aria-hidden />
              <span>
                {item.commentCount}{" "}
                {item.commentCount === 1 ? "reactie" : "reacties"}
              </span>
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
