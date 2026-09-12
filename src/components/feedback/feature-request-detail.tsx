"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  updateFeatureRequestAction,
  updateFeatureRequestStatusAction,
} from "@/app/(beveiligd)/actions/feature-request-actions";
import {
  DetailActionMenu,
  detailMenuButtonClassName,
} from "@/components/detail/detail-action-menu";
import { InlineSelectField } from "@/components/detail/inline-select-field";
import { InlineTextField } from "@/components/detail/inline-text-field";
import {
  DetailHeader,
  DetailPage,
  DetailSection,
} from "@/components/detail/detail-layout";
import { FeatureRequestBackLink } from "@/components/feedback/feature-request-back-link";
import { FeatureRequestCommentForm } from "@/components/feedback/feature-request-comment-form";
import { FeatureRequestVoteButton } from "@/components/feedback/feature-request-vote-button";
import { MergeFeatureRequestDialog } from "@/components/feedback/merge-feature-request-dialog";
import { Badge } from "@/components/ui/badge";
import { UserName } from "@/components/user/user-name";
import type { FeatureRequestMergeTarget } from "@/lib/feature-request-service";
import type {
  FeatureRequestStatus,
  FeatureRequestType,
} from "@/lib/feature-request-validation";
import {
  featureRequestStatusLabels,
  featureRequestStatusTones,
  featureRequestTypeLabels,
  featureRequestTypes,
} from "@/lib/feature-request-validation";
import { formatDateTime } from "@/lib/format";
import { featureRequestPath } from "@/lib/paths";

const editableStatuses = ["OPEN", "PLANNED", "IN_PROGRESS", "DONE"] as const;

export type FeatureRequestDetailViewModel = {
  id: string;
  slug: string;
  type: FeatureRequestType;
  status: FeatureRequestStatus;
  title: string;
  description: string | null;
  authorUserId: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
    image: string | null;
    slug: string | null;
  };
  mergedInto: {
    id: string;
    slug: string;
    title: string;
    status: FeatureRequestStatus;
  } | null;
  voteCount: number;
  commentCount: number;
  viewerHasVoted: boolean;
  comments: FeatureRequestCommentViewModel[];
};

export type FeatureRequestCommentViewModel = {
  id: string;
  body: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
    image: string | null;
    slug: string | null;
  };
};

export function FeatureRequestDetailView({
  request,
  mergeTargets,
  canWrite,
  canEdit,
  canManage,
}: {
  request: FeatureRequestDetailViewModel;
  mergeTargets: FeatureRequestMergeTarget[];
  canWrite: boolean;
  canEdit: boolean;
  canManage: boolean;
}) {
  const merged = request.status === "MERGED";
  const [mergeOpen, setMergeOpen] = useState(false);
  const [comments, setComments] = useState(request.comments);
  const commentIds = useMemo(
    () => new Set(request.comments.map((comment) => comment.id)),
    [request.comments],
  );

  const visibleComments = useMemo(() => {
    const extras = comments.filter((comment) => !commentIds.has(comment.id));
    return [...request.comments, ...extras];
  }, [comments, commentIds, request.comments]);

  async function saveField(
    input: { type?: string; title?: string; description?: string },
  ) {
    const result = await updateFeatureRequestAction(request.id, input);
    return result.error ?? null;
  }

  return (
    <DetailPage>
      <DetailHeader
        back={<FeatureRequestBackLink />}
        title={
          canEdit ? (
            <InlineTextField
              label="Titel"
              value={request.title}
              variant="title"
              required
              onSave={(title) => saveField({ title })}
            />
          ) : (
            <h1 className="page-header-title">{request.title}</h1>
          )
        }
        status={
          canManage && !merged ? (
            <InlineSelectField
              label="Status"
              value={request.status}
              hideLabel
              compact
              items={editableStatuses.map((status) => ({
                value: status,
                label: featureRequestStatusLabels[status],
              }))}
              onSave={async (status) => {
                const result = await updateFeatureRequestStatusAction(
                  request.id,
                  status,
                );
                return result.error ?? null;
              }}
            />
          ) : (
            <Badge tone={featureRequestStatusTones[request.status]}>
              {featureRequestStatusLabels[request.status]}
            </Badge>
          )
        }
        meta={
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            {canEdit ? (
              <InlineSelectField
                label="Type"
                value={request.type}
                hideLabel
                compact
                items={featureRequestTypes.map((type) => ({
                  value: type,
                  label: featureRequestTypeLabels[type],
                }))}
                onSave={(type) => saveField({ type })}
              />
            ) : (
              <span>{featureRequestTypeLabels[request.type]}</span>
            )}
            <span className="text-fg-subtle" aria-hidden>
              ·
            </span>
            <UserName
              name={request.author.name}
              image={request.author.image}
              slug={request.author.slug}
            />
            <span className="text-fg-subtle" aria-hidden>
              ·
            </span>
            <time dateTime={request.createdAt}>
              {formatDateTime(new Date(request.createdAt))}
            </time>
          </div>
        }
        actions={
          <>
            <FeatureRequestVoteButton
              requestId={request.id}
              voteCount={request.voteCount}
              viewerHasVoted={request.viewerHasVoted}
              canVote={canWrite && !merged}
              disabledReason={
                merged
                  ? "Op een samengevoegd verzoek kan niet meer worden gestemd."
                  : undefined
              }
            />
            {canManage && !merged ? (
              <DetailActionMenu>
                <button
                  type="button"
                  className={detailMenuButtonClassName()}
                  onClick={() => setMergeOpen(true)}
                >
                  Samenvoegen…
                </button>
              </DetailActionMenu>
            ) : null}
          </>
        }
      />
      {canManage && !merged ? (
        <MergeFeatureRequestDialog
          sourceId={request.id}
          targets={mergeTargets}
          open={mergeOpen}
          onOpenChange={setMergeOpen}
        />
      ) : null}

      {merged && request.mergedInto ? (
        <p
          className="rounded-sm border border-border bg-surface-sunk px-3 py-2 text-sm text-fg"
          role="status"
        >
          Samengevoegd met{" "}
          <Link
            href={featureRequestPath(request.mergedInto)}
            className="font-medium hover:underline"
          >
            {request.mergedInto.title}
          </Link>
          .
        </p>
      ) : null}

      <DetailSection title="Omschrijving">
        {canEdit ? (
          <InlineTextField
            label="Omschrijving"
            value={request.description ?? ""}
            multiline
            placeholder="Geen omschrijving"
            onSave={(description) => saveField({ description })}
          />
        ) : request.description ? (
          <p className="whitespace-pre-wrap text-sm break-words text-fg">
            {request.description}
          </p>
        ) : (
          <p className="text-sm text-fg-muted">Geen omschrijving</p>
        )}
      </DetailSection>

      <DetailSection
        title="Reacties"
        action={
          visibleComments.length > 0 ? (
            <span className="text-xs text-fg-muted tabular-nums">
              {visibleComments.length}
            </span>
          ) : null
        }
      >
        {visibleComments.length === 0 ? (
          <p className="text-sm text-fg-muted">Nog geen reacties.</p>
        ) : (
          <ul className="divide-y divide-border">
            {visibleComments.map((comment) => (
              <FeatureRequestComment key={comment.id} comment={comment} />
            ))}
          </ul>
        )}
        {canWrite && !merged ? (
          <div className="mt-3">
            <FeatureRequestCommentForm
              requestId={request.id}
              onCreated={(comment) => {
                setComments((current) => {
                  if (current.some((item) => item.id === comment.id)) {
                    return current;
                  }
                  return [
                    ...current,
                    {
                      id: comment.id,
                      body: comment.body,
                      createdAt: comment.createdAt,
                      author: comment.author,
                    },
                  ];
                });
              }}
            />
          </div>
        ) : null}
      </DetailSection>
    </DetailPage>
  );
}

function FeatureRequestComment({
  comment,
}: {
  comment: FeatureRequestCommentViewModel;
}) {
  return (
    <li className="py-3">
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-fg-muted">
        <UserName
          name={comment.author.name}
          image={comment.author.image}
          slug={comment.author.slug}
        />
        <time dateTime={comment.createdAt}>
          {formatDateTime(new Date(comment.createdAt))}
        </time>
      </div>
      <p className="mt-1 whitespace-pre-wrap text-sm break-words text-fg">
        {comment.body}
      </p>
    </li>
  );
}
