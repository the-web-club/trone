import type { Metadata } from "next";
import { ListBody, ListBrowser } from "@/components/list/list-browser";
import { ListPagination } from "@/components/list/list-pagination";
import { PageHeader } from "@/components/shell/page-header";
import { TasksFilters } from "@/components/task/tasks-filters";
import { TasksList } from "@/components/task/tasks-list";
import { requireSession } from "@/lib/auth-session";
import { listSummary } from "@/lib/list-copy";
import { listTasks } from "@/lib/task-service";
import { buildTasksHref, parseTasksSearchParams } from "@/lib/tasks-query";

export const metadata: Metadata = { title: "Taken" };

export default async function TakenPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireSession();
  const parsed = parseTasksSearchParams(await searchParams);
  const hasFilters = Boolean(
    parsed.zoeken ||
      parsed.scope !== "aan-mij" ||
      parsed.status !== "open" ||
      parsed.van ||
      parsed.tot,
  );

  const result = await listTasks({
    query: parsed.zoeken || undefined,
    scope: parsed.scope,
    status: parsed.status,
    van: parsed.van || undefined,
    tot: parsed.tot || undefined,
    page: parsed.pagina,
    currentUserId: session.user.id,
  });

  const totalPages = Math.max(Math.ceil(result.total / result.pageSize), 1);
  const emptyMessage = hasFilters
    ? "Geen taken gevonden voor deze filters."
    : "Nog geen openstaande taken.";

  return (
    <ListBrowser>
      <PageHeader
        title="Taken"
        description="Persoonlijke opvolging en herinneringen."
        meta={[
          result.total === 0 && hasFilters
            ? "Geen resultaten"
            : listSummary(result.total, "taak", "taken"),
        ]}
      />
      <TasksFilters values={parsed} />
      <ListBody>
        <TasksList items={result.items} emptyMessage={emptyMessage} />
        <ListPagination
          page={parsed.pagina}
          totalPages={totalPages}
          hrefForPage={(pagina) => buildTasksHref({ ...parsed, pagina })}
        />
      </ListBody>
    </ListBrowser>
  );
}
