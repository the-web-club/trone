import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { FeatureRequestDetailView } from "@/components/feedback/feature-request-detail";
import {
  getSessionRole,
  isAdminSession,
  isViewerSession,
  requireSession,
} from "@/lib/auth-session";
import { isAppError } from "@/lib/errors";
import { canEditFeatureRequest } from "@/lib/feature-request-access";
import {
  getFeatureRequest,
  listFeatureRequestMergeTargets,
} from "@/lib/feature-request-service";
import { featureRequestPath } from "@/lib/paths";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  try {
    const session = await requireSession();
    const { slug } = await params;
    const request = await getFeatureRequest(slug, session.user.id);
    return { title: request.title };
  } catch {
    return { title: "Feedback" };
  }
}

export default async function FeedbackDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await requireSession();
  const request = await getFeatureRequest(slug, session.user.id).catch(
    (error) => {
      if (isAppError(error) && error.status === 404) notFound();
      throw error;
    },
  );

  if (slug !== request.slug) redirect(featureRequestPath(request));

  const actor = { id: session.user.id, role: getSessionRole(session) };
  const canWrite = !isViewerSession(session);
  const canManage = isAdminSession(session);
  const canEdit = canEditFeatureRequest(actor, request);
  const mergeTargets = canManage
    ? await listFeatureRequestMergeTargets(request.id)
    : [];

  return (
    <FeatureRequestDetailView
      request={{
        ...request,
        createdAt: request.createdAt.toISOString(),
        comments: request.comments.map((comment) => ({
          id: comment.id,
          body: comment.body,
          createdAt: comment.createdAt.toISOString(),
          author: comment.author,
        })),
      }}
      mergeTargets={mergeTargets}
      canWrite={canWrite}
      canEdit={canEdit}
      canManage={canManage}
    />
  );
}
