import { AppError } from "@/lib/errors";
import type { FeatureRequestStatus } from "@/lib/feature-request-validation";

export type FeatureRequestActor = {
  id: string;
  role: string;
};

export function isFeatureRequestAdmin(actor: FeatureRequestActor): boolean {
  return actor.role === "admin";
}

export function canWriteFeatureRequests(actor: FeatureRequestActor): boolean {
  return actor.role !== "viewer";
}

export function canManageFeatureRequests(actor: FeatureRequestActor): boolean {
  return isFeatureRequestAdmin(actor);
}

export function canEditFeatureRequest(
  actor: FeatureRequestActor,
  request: { authorUserId: string; status: FeatureRequestStatus },
): boolean {
  if (request.status === "MERGED") return false;
  if (isFeatureRequestAdmin(actor)) return true;
  return canWriteFeatureRequests(actor) && actor.id === request.authorUserId;
}

export function canVoteOnFeatureRequest(status: FeatureRequestStatus): boolean {
  return status !== "MERGED";
}

export function canCommentOnFeatureRequest(
  status: FeatureRequestStatus,
): boolean {
  return status !== "MERGED";
}

export function assertCanWriteFeatureRequests(
  actor: FeatureRequestActor,
): void {
  if (!canWriteFeatureRequests(actor)) {
    throw new AppError(
      "Een alleen-lezen account mag dit niet wijzigen.",
      "FORBIDDEN",
      403,
    );
  }
}

export function assertCanEditFeatureRequest(
  actor: FeatureRequestActor,
  request: { authorUserId: string; status: FeatureRequestStatus },
): void {
  if (request.status === "MERGED") {
    throw new AppError(
      "Een samengevoegd verzoek kan niet meer worden aangepast.",
      "VALIDATION",
    );
  }
  if (isFeatureRequestAdmin(actor)) return;
  assertCanWriteFeatureRequests(actor);
  if (actor.id !== request.authorUserId) {
    throw new AppError(
      "Alleen een beheerder mag verzoeken van anderen aanpassen.",
      "FORBIDDEN",
      403,
    );
  }
}

export function assertCanManageFeatureRequests(
  actor: FeatureRequestActor,
): void {
  if (!canManageFeatureRequests(actor)) {
    throw new AppError("Alleen een beheerder mag dit doen.", "FORBIDDEN", 403);
  }
}

export function assertCanVoteOnFeatureRequest(
  status: FeatureRequestStatus,
): void {
  if (!canVoteOnFeatureRequest(status)) {
    throw new AppError(
      "Op een samengevoegd verzoek kan niet meer worden gestemd.",
      "VALIDATION",
    );
  }
}

export function assertCanCommentOnFeatureRequest(
  status: FeatureRequestStatus,
): void {
  if (!canCommentOnFeatureRequest(status)) {
    throw new AppError(
      "Op een samengevoegd verzoek kan niet meer worden gereageerd.",
      "VALIDATION",
    );
  }
}

export type MergeDecision = "ok" | "idempotent";

export function assertCanMergeFeatureRequests(
  source: {
    id: string;
    status: FeatureRequestStatus;
    mergedIntoId: string | null;
  },
  target: {
    id: string;
    status: FeatureRequestStatus;
    mergedIntoId: string | null;
  },
): MergeDecision {
  if (source.id === target.id) {
    throw new AppError(
      "Een verzoek kan niet met zichzelf worden samengevoegd.",
      "VALIDATION",
    );
  }
  if (source.status === "MERGED" && source.mergedIntoId === target.id) {
    return "idempotent";
  }
  if (source.status === "MERGED") {
    throw new AppError(
      "Dit verzoek is al samengevoegd met een ander verzoek.",
      "VALIDATION",
    );
  }
  if (target.status === "MERGED") {
    throw new AppError(
      "Kies een verzoek dat zelf niet is samengevoegd.",
      "VALIDATION",
    );
  }
  if (target.mergedIntoId === source.id) {
    throw new AppError(
      "Deze verzoeken vormen een lus en kunnen niet worden samengevoegd.",
      "VALIDATION",
    );
  }
  return "ok";
}

export function planMergeVotes(
  sourceUserIds: string[],
  targetUserIds: string[],
): { moveUserIds: string[]; dropUserIds: string[] } {
  const target = new Set(targetUserIds);
  const seen = new Set<string>();
  const moveUserIds: string[] = [];
  const dropUserIds: string[] = [];

  for (const userId of sourceUserIds) {
    if (seen.has(userId) || target.has(userId)) {
      dropUserIds.push(userId);
      continue;
    }
    seen.add(userId);
    moveUserIds.push(userId);
  }

  return { moveUserIds, dropUserIds };
}
