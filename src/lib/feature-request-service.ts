import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import {
  assertCanCommentOnFeatureRequest,
  assertCanEditFeatureRequest,
  assertCanManageFeatureRequests,
  assertCanMergeFeatureRequests,
  assertCanVoteOnFeatureRequest,
  assertCanWriteFeatureRequests,
  planMergeVotes,
  type FeatureRequestActor,
} from "@/lib/feature-request-access";
import {
  statusValuesForFilter,
  typeValueForFilter,
  type FeatureRequestFilterValues,
  type FeatureRequestSort,
} from "@/lib/feature-request-query";
import type {
  CreateFeatureRequestInput,
  FeatureRequestStatus,
  UpdateFeatureRequestInput,
} from "@/lib/feature-request-validation";
import { getPrismaClient } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { createId, whereIdOrSlug } from "@/lib/id";
import { effectiveSearchQuery, paginateArgs, type PagedList } from "@/lib/list-query";
import { allocateUniqueSlug } from "@/lib/slug";

const authorSelect = {
  id: true,
  name: true,
  image: true,
  slug: true,
} satisfies Prisma.UserSelect;

function viewerVoteInclude(userId: string) {
  return {
    where: { userId },
    select: { id: true },
    take: 1,
  } satisfies Prisma.FeatureRequest$votesArgs;
}

function listInclude(userId: string) {
  return {
    author: { select: authorSelect },
    mergedInto: {
      select: { id: true, slug: true, title: true, status: true },
    },
    _count: { select: { votes: true, comments: true } },
    votes: viewerVoteInclude(userId),
  } satisfies Prisma.FeatureRequestInclude;
}

const commentInclude = {
  author: { select: authorSelect },
} satisfies Prisma.FeatureRequestCommentInclude;

export type FeatureRequestListItem = {
  id: string;
  slug: string;
  type: FeatureRequestListRecord["type"];
  status: FeatureRequestListRecord["status"];
  title: string;
  description: string | null;
  authorUserId: string;
  createdAt: Date;
  author: FeatureRequestListRecord["author"];
  mergedInto: FeatureRequestListRecord["mergedInto"];
  voteCount: number;
  commentCount: number;
  viewerHasVoted: boolean;
};

type FeatureRequestListRecord = Prisma.FeatureRequestGetPayload<{
  include: ReturnType<typeof listInclude>;
}>;

export type FeatureRequestCommentItem = Prisma.FeatureRequestCommentGetPayload<{
  include: typeof commentInclude;
}>;

export type FeatureRequestDetail = FeatureRequestListItem & {
  comments: FeatureRequestCommentItem[];
};

export type FeatureRequestMergeTarget = {
  id: string;
  slug: string;
  title: string;
  status: FeatureRequestListRecord["status"];
};

function mapListItem(row: FeatureRequestListRecord): FeatureRequestListItem {
  return {
    id: row.id,
    slug: row.slug,
    type: row.type,
    status: row.status,
    title: row.title,
    description: row.description,
    authorUserId: row.authorUserId,
    createdAt: row.createdAt,
    author: row.author,
    mergedInto: row.mergedInto,
    voteCount: row._count.votes,
    commentCount: row._count.comments,
    viewerHasVoted: row.votes.length > 0,
  };
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === "P2002"
  );
}

export function buildFeatureRequestListWhere(
  filters: Partial<FeatureRequestFilterValues>,
  currentUserId: string,
): Prisma.FeatureRequestWhereInput {
  const and: Prisma.FeatureRequestWhereInput[] = [];

  const statuses = statusValuesForFilter(filters.status ?? "actief");
  if (statuses) and.push({ status: { in: statuses } });

  const type = typeValueForFilter(filters.type ?? "alle");
  if (type) and.push({ type });

  if (filters.mijnStemmen) {
    and.push({ votes: { some: { userId: currentUserId } } });
  }

  const search = effectiveSearchQuery(filters.zoeken);
  if (search) {
    and.push({
      OR: [
        { title: { contains: search } },
        { description: { contains: search } },
      ],
    });
  }

  return and.length ? { AND: and } : {};
}

function listOrderBy(
  sortering: FeatureRequestSort | undefined,
): Prisma.FeatureRequestOrderByWithRelationInput[] {
  if (sortering === "nieuwste") {
    return [{ createdAt: "desc" }, { id: "desc" }];
  }
  return [{ votes: { _count: "desc" } }, { createdAt: "desc" }, { id: "desc" }];
}

export async function listFeatureRequests(
  filters: FeatureRequestFilterValues & { pagina?: number },
  currentUserId: string,
): Promise<PagedList<FeatureRequestListItem>> {
  const prisma = getPrismaClient();
  const where = buildFeatureRequestListWhere(filters, currentUserId);
  const { page, pageSize, skip, take } = paginateArgs(filters.pagina);
  const [rows, total] = await Promise.all([
    prisma.featureRequest.findMany({
      where,
      include: listInclude(currentUserId),
      orderBy: listOrderBy(filters.sortering),
      skip,
      take,
    }),
    prisma.featureRequest.count({ where }),
  ]);

  return {
    items: rows.map(mapListItem),
    total,
    page,
    pageSize,
  };
}

export async function getFeatureRequest(
  slugOrId: string,
  currentUserId: string,
): Promise<FeatureRequestDetail> {
  const prisma = getPrismaClient();
  const row = await prisma.featureRequest.findFirst({
    where: whereIdOrSlug(slugOrId),
    include: {
      ...listInclude(currentUserId),
      comments: {
        include: commentInclude,
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      },
    },
  });

  if (!row) {
    throw new AppError("Verzoek niet gevonden.", "NOT_FOUND", 404);
  }

  const { comments, ...rest } = row;
  return {
    ...mapListItem(rest),
    comments,
  };
}

export async function listFeatureRequestMergeTargets(
  excludeId: string,
  query?: string,
): Promise<FeatureRequestMergeTarget[]> {
  const prisma = getPrismaClient();
  const search = effectiveSearchQuery(query, 1);
  const where: Prisma.FeatureRequestWhereInput = {
    id: { not: excludeId },
    status: { not: "MERGED" },
  };
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { description: { contains: search } },
    ];
  }

  return prisma.featureRequest.findMany({
    where,
    select: { id: true, slug: true, title: true, status: true },
    orderBy: [{ votes: { _count: "desc" } }, { createdAt: "desc" }, { id: "desc" }],
    take: 50,
  });
}

export async function createFeatureRequest(
  input: CreateFeatureRequestInput,
  actor: FeatureRequestActor,
) {
  assertCanWriteFeatureRequests(actor);
  const prisma = getPrismaClient();
  const slug = await allocateUniqueSlug(
    async (candidate) =>
      Boolean(
        await prisma.featureRequest.findUnique({
          where: { slug: candidate },
          select: { id: true },
        }),
      ),
    input.title,
    "verzoek",
  );

  const created = await prisma.featureRequest.create({
    data: {
      id: createId(),
      slug,
      type: input.type,
      status: "OPEN",
      title: input.title,
      description: input.description,
      authorUserId: actor.id,
    },
    select: { id: true, slug: true },
  });

  return created;
}

export async function updateFeatureRequest(
  id: string,
  input: UpdateFeatureRequestInput,
  actor: FeatureRequestActor,
) {
  const prisma = getPrismaClient();
  const current = await prisma.featureRequest.findUnique({
    where: { id },
    select: { id: true, authorUserId: true, status: true, slug: true },
  });
  if (!current) {
    throw new AppError("Verzoek niet gevonden.", "NOT_FOUND", 404);
  }

  assertCanEditFeatureRequest(actor, current);

  return prisma.featureRequest.update({
    where: { id: current.id },
    data: {
      ...(input.type ? { type: input.type } : {}),
      ...(input.title != null ? { title: input.title } : {}),
      ...(input.description !== undefined
        ? { description: input.description }
        : {}),
    },
    select: { id: true, slug: true },
  });
}

export async function updateFeatureRequestStatus(
  id: string,
  status: FeatureRequestStatus,
  actor: FeatureRequestActor,
) {
  assertCanManageFeatureRequests(actor);
  if (status === "MERGED") {
    throw new AppError(
      "Gebruik samenvoegen om een verzoek als samengevoegd te markeren.",
      "VALIDATION",
    );
  }

  const prisma = getPrismaClient();
  const current = await prisma.featureRequest.findUnique({
    where: { id },
    select: { id: true, status: true, slug: true },
  });
  if (!current) {
    throw new AppError("Verzoek niet gevonden.", "NOT_FOUND", 404);
  }
  if (current.status === "MERGED") {
    throw new AppError(
      "De status van een samengevoegd verzoek kan niet worden gewijzigd.",
      "VALIDATION",
    );
  }

  return prisma.featureRequest.update({
    where: { id: current.id },
    data: { status },
    select: { id: true, slug: true },
  });
}

export async function addFeatureRequestVote(
  requestId: string,
  actor: FeatureRequestActor,
): Promise<{ voted: true; created: boolean }> {
  assertCanWriteFeatureRequests(actor);
  const prisma = getPrismaClient();
  const request = await prisma.featureRequest.findUnique({
    where: { id: requestId },
    select: { id: true, status: true },
  });
  if (!request) {
    throw new AppError("Verzoek niet gevonden.", "NOT_FOUND", 404);
  }
  assertCanVoteOnFeatureRequest(request.status);

  try {
    await prisma.featureRequestVote.create({
      data: {
        id: createId(),
        requestId: request.id,
        userId: actor.id,
      },
    });
    return { voted: true, created: true };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { voted: true, created: false };
    }
    throw error;
  }
}

export async function removeFeatureRequestVote(
  requestId: string,
  actor: FeatureRequestActor,
): Promise<{ voted: false; removed: number }> {
  assertCanWriteFeatureRequests(actor);
  const prisma = getPrismaClient();
  const request = await prisma.featureRequest.findUnique({
    where: { id: requestId },
    select: { id: true, status: true },
  });
  if (!request) {
    throw new AppError("Verzoek niet gevonden.", "NOT_FOUND", 404);
  }
  assertCanVoteOnFeatureRequest(request.status);

  const result = await prisma.featureRequestVote.deleteMany({
    where: { requestId: request.id, userId: actor.id },
  });
  return { voted: false, removed: result.count };
}

export async function addFeatureRequestComment(
  requestId: string,
  body: string,
  actor: FeatureRequestActor,
): Promise<FeatureRequestCommentItem> {
  assertCanWriteFeatureRequests(actor);
  const prisma = getPrismaClient();
  const request = await prisma.featureRequest.findUnique({
    where: { id: requestId },
    select: { id: true, status: true },
  });
  if (!request) {
    throw new AppError("Verzoek niet gevonden.", "NOT_FOUND", 404);
  }
  assertCanCommentOnFeatureRequest(request.status);

  return prisma.featureRequestComment.create({
    data: {
      id: createId(),
      requestId: request.id,
      authorUserId: actor.id,
      body,
    },
    include: commentInclude,
  });
}

export async function mergeFeatureRequests(
  sourceId: string,
  targetId: string,
  actor: FeatureRequestActor,
): Promise<{ sourceSlug: string; targetSlug: string; idempotent: boolean }> {
  assertCanManageFeatureRequests(actor);
  const prisma = getPrismaClient();

  return prisma.$transaction(async (tx) => {
    const [source, target] = await Promise.all([
      tx.featureRequest.findUnique({
        where: { id: sourceId },
        include: { votes: { select: { userId: true } } },
      }),
      tx.featureRequest.findUnique({
        where: { id: targetId },
        include: { votes: { select: { userId: true } } },
      }),
    ]);

    if (!source || !target) {
      throw new AppError("Verzoek niet gevonden.", "NOT_FOUND", 404);
    }

    const decision = assertCanMergeFeatureRequests(source, target);
    if (decision === "idempotent") {
      return {
        sourceSlug: source.slug,
        targetSlug: target.slug,
        idempotent: true,
      };
    }

    const plan = planMergeVotes(
      source.votes.map((vote) => vote.userId),
      target.votes.map((vote) => vote.userId),
    );

    if (plan.dropUserIds.length > 0) {
      await tx.featureRequestVote.deleteMany({
        where: {
          requestId: source.id,
          userId: { in: plan.dropUserIds },
        },
      });
    }

    if (plan.moveUserIds.length > 0) {
      await tx.featureRequestVote.updateMany({
        where: {
          requestId: source.id,
          userId: { in: plan.moveUserIds },
        },
        data: { requestId: target.id },
      });
    }

    await tx.featureRequest.update({
      where: { id: source.id },
      data: { status: "MERGED", mergedIntoId: target.id },
    });

    return {
      sourceSlug: source.slug,
      targetSlug: target.slug,
      idempotent: false,
    };
  });
}
