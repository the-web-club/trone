import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CreateFeatureRequestDialog } from "@/components/feedback/create-feature-request-dialog";
import { FeatureRequestFilters } from "@/components/feedback/feature-request-filters";
import { FeatureRequestList } from "@/components/feedback/feature-request-list";
import { ListBody, ListBrowser } from "@/components/list/list-browser";
import { ListPagination } from "@/components/list/list-pagination";
import { PageHeader, PageHeaderNavLink } from "@/components/shell/page-header";
import { isViewerSession, requireSession } from "@/lib/auth-session";
import {
  buildFeatureRequestHref,
  parseFeatureRequestSearchParams,
} from "@/lib/feature-request-query";
import { listFeatureRequests } from "@/lib/feature-request-service";
import { listSummary } from "@/lib/list-copy";

export const metadata: Metadata = { title: "Feedback & verbeteringen" };

export default async function FeedbackPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireSession();
  const parsed = parseFeatureRequestSearchParams(await searchParams);
  const canWrite = !isViewerSession(session);

  const hasFilters = Boolean(
    parsed.zoeken ||
      parsed.type !== "alle" ||
      parsed.status !== "actief" ||
      parsed.sortering !== "populair" ||
      parsed.mijnStemmen,
  );

  const result = await listFeatureRequests(parsed, session.user.id);
  const totalPages = Math.max(Math.ceil(result.total / result.pageSize), 1);

  let emptyMessage: ReactNode = "Nog geen verzoeken.";
  if (result.total === 0 && hasFilters) {
    emptyMessage = "Geen verzoeken gevonden voor deze filters.";
  } else if (result.total === 0) {
    emptyMessage = "Nog geen verzoeken. Stel als eerste een verbetering voor.";
  }

  const createAction = canWrite ? <CreateFeatureRequestDialog /> : null;

  return (
    <ListBrowser>
      <PageHeader
        title="Feedback & verbeteringen"
        nav={
          <PageHeaderNavLink href="/instellingen">
            Terug naar instellingen
          </PageHeaderNavLink>
        }
        description="Stel verbeteringen voor en stem op ideeën van anderen."
        meta={[
          result.total === 0 && hasFilters
            ? "Geen resultaten"
            : listSummary(result.total, "verzoek", "verzoeken"),
        ]}
        actions={createAction}
      />
      <FeatureRequestFilters values={parsed} />
      <ListBody>
        <FeatureRequestList
          items={result.items}
          emptyMessage={emptyMessage}
          emptyAction={
            canWrite && !hasFilters ? (
              <>
                {" "}
                <CreateFeatureRequestDialog
                  trigger={
                    <button type="button" className="text-fg hover:underline">
                      Nieuw verzoek
                    </button>
                  }
                />
              </>
            ) : undefined
          }
          canVote={canWrite}
        />
        <ListPagination
          page={parsed.pagina}
          totalPages={totalPages}
          hrefForPage={(pagina) =>
            buildFeatureRequestHref({ ...parsed, pagina })
          }
        />
      </ListBody>
    </ListBrowser>
  );
}
