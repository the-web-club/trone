import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ListBody, ListBrowser } from "@/components/list/list-browser";
import { ListPagination } from "@/components/list/list-pagination";
import { PageHeader } from "@/components/shell/page-header";
import { CreateTaskListDialog } from "@/components/task/create-task-list-dialog";
import { TasksFilters } from "@/components/task/tasks-filters";
import { TasksList } from "@/components/task/tasks-list";
import { isViewerSession, requireSession } from "@/lib/auth-session";
import { listDealTeamMembers, listDealsForTaskSelect } from "@/lib/deal-service";
import { listSummary } from "@/lib/list-copy";
import { getTaskFilterFacets, listTasks } from "@/lib/task-service";
import { buildTasksHref, parseTasksSearchParams } from "@/lib/tasks-query";

export const metadata: Metadata = { title: "Taken" };

export default async function TakenPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireSession();
  const parsed = parseTasksSearchParams(await searchParams);
  const currentUserId = session.user.id;
  const canWrite = !isViewerSession(session);

  const listFilters = {
    zoeken: parsed.zoeken,
    eigenaar: parsed.eigenaar,
    afgerond: parsed.afgerond,
    wanneer: parsed.wanneer,
    van: parsed.van || undefined,
    tot: parsed.tot || undefined,
    page: parsed.pagina,
  };

  const hasFilters = Boolean(
    parsed.zoeken ||
      parsed.eigenaar !== "aan-mij" ||
      parsed.afgerond ||
      parsed.wanneer !== "alle" ||
      parsed.van ||
      parsed.tot,
  );

  const [result, facets, members, deals] = await Promise.all([
    listTasks(listFilters, currentUserId),
    getTaskFilterFacets(listFilters, currentUserId),
    listDealTeamMembers(),
    listDealsForTaskSelect(),
  ]);

  const totalPages = Math.max(Math.ceil(result.total / result.pageSize), 1);
  let emptyMessage: ReactNode = "Nog geen open taken voor jou.";
  if (result.total === 0 && hasFilters) {
    emptyMessage = "Geen taken gevonden voor deze filters.";
  } else if (result.total === 0 && parsed.eigenaar === "aan-mij") {
    emptyMessage = "Nog geen open taken voor jou.";
  } else if (result.total === 0) {
    emptyMessage = "Nog geen taken.";
  }

  const createTask = canWrite ? (
    <CreateTaskListDialog deals={deals} />
  ) : null;

  return (
    <ListBrowser>
      <PageHeader
        title="Taken"
        description="Vervolgacties van het hele team. Standaard zie je je eigen open taken."
        meta={[
          result.total === 0 && hasFilters
            ? "Geen resultaten"
            : listSummary(result.total, "taak", "taken"),
        ]}
        actions={createTask}
      />
      <TasksFilters values={parsed} members={members} facets={facets} />
      <ListBody>
        <TasksList
          items={result.items}
          emptyMessage={emptyMessage}
          emptyAction={
            canWrite && !hasFilters ? (
              <>
                {" "}
                <CreateTaskListDialog
                  deals={deals}
                  trigger={
                    <button type="button" className="text-fg hover:underline">
                      Nieuwe taak
                    </button>
                  }
                />
              </>
            ) : undefined
          }
          canWrite={canWrite}
        />
        <ListPagination
          page={parsed.pagina}
          totalPages={totalPages}
          hrefForPage={(pagina) => buildTasksHref({ ...parsed, pagina })}
        />
      </ListBody>
    </ListBrowser>
  );
}
