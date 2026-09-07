import type { Metadata } from "next";
import { ListBody, ListBrowser } from "@/components/list/list-browser";
import { ListPagination } from "@/components/list/list-pagination";
import { PageHeader } from "@/components/shell/page-header";
import { CompleteTaskButton } from "@/components/task/complete-task-button";
import { TasksFilters } from "@/components/task/tasks-filters";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableEmptyRow,
  TableHeader,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import { requireSession } from "@/lib/auth-session";
import { formatDate } from "@/lib/format";
import { listSummary } from "@/lib/list-copy";
import { CompanyLink, ContactLink, DealLink } from "@/components/entity-links";
import { UserName } from "@/components/user/user-name";
import { listTasks } from "@/lib/task-service";
import { taskPriorityLabels, taskStatusLabels } from "@/lib/task-validation";
import { buildTasksHref, parseTasksSearchParams } from "@/lib/tasks-query";

export const metadata: Metadata = { title: "Taken" };

function linkedEntities(task: {
  deal: { id: string; slug: string; title: string } | null;
  contact: {
    id: string;
    slug: string;
    firstName: string;
    lastName: string | null;
  } | null;
  company: { id: string; slug: string; name: string } | null;
}) {
  return (
    <>
      {task.deal ? <DealLink deal={task.deal} /> : null}
      {task.deal && (task.contact || task.company) ? " · " : null}
      {task.contact ? <ContactLink contact={task.contact} /> : null}
      {task.contact && task.company ? " · " : null}
      {task.company ? <CompanyLink company={task.company} /> : null}
    </>
  );
}

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
        <TableContainer>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHeaderCell>Taak</TableHeaderCell>
                <TableHeaderCell>Vervaldatum</TableHeaderCell>
                <TableHeaderCell>Gekoppeld</TableHeaderCell>
                <TableHeaderCell>Toegewezen</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell />
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.items.length === 0 ? (
                <TableEmptyRow colSpan={6}>{emptyMessage}</TableEmptyRow>
              ) : (
                result.items.map((task) => {
                  const linked = task.deal || task.contact || task.company;
                  const overdue =
                    task.status === "OPEN" &&
                    task.dueAt &&
                    task.dueAt < new Date();
                  return (
                    <TableRow key={task.id}>
                      <TableCell>
                        <span className="font-medium text-fg">{task.title}</span>
                        {task.priority ? (
                          <span className="ml-2 text-xs text-fg-muted">
                            {taskPriorityLabels[task.priority]}
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell
                        className={overdue ? "text-danger" : "text-fg-muted"}
                      >
                        {task.dueAt ? formatDate(task.dueAt) : "—"}
                      </TableCell>
                      <TableCell className="text-fg-muted">
                        {linked ? linkedEntities(task) : "—"}
                      </TableCell>
                      <TableCell className="text-fg-muted">
                        <UserName
                          name={task.assignee.name}
                          image={task.assignee.image}
                          slug={task.assignee.slug}
                        />
                      </TableCell>
                      <TableCell>
                        <Badge
                          tone={
                            task.status === "DONE"
                              ? "success"
                              : task.status === "CANCELLED"
                                ? "default"
                                : overdue
                                  ? "danger"
                                  : "info"
                          }
                        >
                          {taskStatusLabels[task.status]}
                        </Badge>
                      </TableCell>
                      <TableCell align="right">
                        {task.status === "OPEN" ? (
                          <CompleteTaskButton taskId={task.id} />
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <ListPagination
          page={parsed.pagina}
          totalPages={totalPages}
          hrefForPage={(pagina) => buildTasksHref({ ...parsed, pagina })}
        />
      </ListBody>
    </ListBrowser>
  );
}
