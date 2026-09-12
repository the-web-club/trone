"use server";

import { revalidatePath } from "next/cache";
import {
  getSessionRole,
  requireSession,
  requireWritableSession,
  type AppSession,
} from "@/lib/auth-session";
import { toActionError } from "@/lib/errors";
import type { FeatureRequestActor } from "@/lib/feature-request-access";
import {
  addFeatureRequestComment,
  addFeatureRequestVote,
  createFeatureRequest,
  mergeFeatureRequests,
  removeFeatureRequestVote,
  updateFeatureRequest,
  updateFeatureRequestStatus,
} from "@/lib/feature-request-service";
import {
  parseCreateFeatureRequestForm,
  parseFeatureRequestCommentForm,
  parseFeatureRequestStatusValue,
  parseMergeFeatureRequestForm,
  parseUpdateFeatureRequestInput,
} from "@/lib/feature-request-validation";
import { featureRequestListPath, featureRequestPath } from "@/lib/paths";

function actorFromSession(session: AppSession): FeatureRequestActor {
  return { id: session.user.id, role: getSessionRole(session) };
}

function revalidateFeatureRequestPaths(request?: { slug: string }) {
  revalidatePath(featureRequestListPath(), "layout");
  if (request) revalidatePath(featureRequestPath(request));
}

export async function createFeatureRequestAction(
  _prev: { error?: string; createdAt?: number; slug?: string } | null,
  formData: FormData,
): Promise<{ error?: string; createdAt?: number; slug?: string }> {
  try {
    const session = await requireWritableSession();
    const input = parseCreateFeatureRequestForm(formData);
    const created = await createFeatureRequest(input, actorFromSession(session));
    revalidateFeatureRequestPaths(created);
    return { createdAt: Date.now(), slug: created.slug };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateFeatureRequestAction(
  id: string,
  input: { type?: string | null; title?: string | null; description?: string | null },
): Promise<{ error?: string; slug?: string }> {
  try {
    const session = await requireSession();
    const parsed = parseUpdateFeatureRequestInput(input);
    const updated = await updateFeatureRequest(
      id,
      parsed,
      actorFromSession(session),
    );
    revalidateFeatureRequestPaths(updated);
    return { slug: updated.slug };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateFeatureRequestStatusAction(
  id: string,
  status: string,
): Promise<{ error?: string }> {
  try {
    const session = await requireSession();
    const parsed = parseFeatureRequestStatusValue(status);
    const updated = await updateFeatureRequestStatus(
      id,
      parsed,
      actorFromSession(session),
    );
    revalidateFeatureRequestPaths(updated);
    return {};
  } catch (error) {
    return toActionError(error);
  }
}

export async function addFeatureRequestVoteAction(
  requestId: string,
): Promise<{ error?: string }> {
  try {
    const session = await requireWritableSession();
    await addFeatureRequestVote(requestId, actorFromSession(session));
    revalidateFeatureRequestPaths();
    return {};
  } catch (error) {
    return toActionError(error);
  }
}

export async function removeFeatureRequestVoteAction(
  requestId: string,
): Promise<{ error?: string }> {
  try {
    const session = await requireWritableSession();
    await removeFeatureRequestVote(requestId, actorFromSession(session));
    revalidateFeatureRequestPaths();
    return {};
  } catch (error) {
    return toActionError(error);
  }
}

export type FeatureRequestCommentActionResult = {
  error?: string;
  createdAt?: number;
  comment?: {
    id: string;
    body: string;
    createdAt: string;
    author: { id: string; name: string; image: string | null; slug: string | null };
  };
};

export async function addFeatureRequestCommentAction(
  _prev: FeatureRequestCommentActionResult | null,
  formData: FormData,
): Promise<FeatureRequestCommentActionResult> {
  try {
    const session = await requireWritableSession();
    const input = parseFeatureRequestCommentForm(formData);
    const comment = await addFeatureRequestComment(
      input.requestId,
      input.body,
      actorFromSession(session),
    );
    revalidateFeatureRequestPaths();
    return {
      createdAt: comment.createdAt.getTime(),
      comment: {
        id: comment.id,
        body: comment.body,
        createdAt: comment.createdAt.toISOString(),
        author: comment.author,
      },
    };
  } catch (error) {
    return toActionError(error);
  }
}

export async function mergeFeatureRequestAction(
  _prev: { error?: string; mergedAt?: number } | null,
  formData: FormData,
): Promise<{ error?: string; mergedAt?: number }> {
  try {
    const session = await requireSession();
    const input = parseMergeFeatureRequestForm(formData);
    const result = await mergeFeatureRequests(
      input.sourceId,
      input.targetId,
      actorFromSession(session),
    );
    revalidatePath(featureRequestListPath());
    revalidatePath(featureRequestPath({ slug: result.sourceSlug }));
    revalidatePath(featureRequestPath({ slug: result.targetSlug }));
    return { mergedAt: Date.now() };
  } catch (error) {
    return toActionError(error);
  }
}
