import { CompanyLink, ContactLink, DealLink } from "@/components/entity-links";
import { CompleteTaskButton } from "@/components/task/complete-task-button";
import { Badge } from "@/components/ui/badge";
import {
  ListCard,
  ListCardActions,
  ListCardEmpty,
  ListCardHeader,
  ListCardRow,
  ListCardRows,
  ListCardTitle,
  ResponsiveListView,
} from "@/components/ui/responsive-list";
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
import { UserName } from "@/components/user/user-name";
import { formatDate } from "@/lib/format";
import {
  taskPriorityLabels,
  taskStatusLabels,
  type TaskPriorityValue,
  type TaskStatusValue,
} from "@/lib/task-validation";

export type TaskListRow = {
  id: string;
  title: string;
  priority: TaskPriorityValue | null;
  dueAt: Date | null;
  status: TaskStatusValue;
  deal: { id: string; slug: string; title: string } | null;
  contact: {
    id: string;
    slug: string;
    firstName: string;
    lastName: string | null;
  } | null;
  company: { id: string; slug: string; name: string } | null;
  assignee: {
    name: string;
    image: string | null;
    slug: string | null;
  };
};

function linkedEntities(task: TaskListRow) {
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

function taskStatusTone(
  status: TaskStatusValue,
  overdue: boolean,
): "success" | "default" | "danger" | "info" {
  if (status === "DONE") return "success";
  if (status === "CANCELLED") return "default";
  if (overdue) return "danger";
  return "info";
}

export function TasksList({
  items,
  emptyMessage,
}: {
  items: TaskListRow[];
  emptyMessage: React.ReactNode;
}) {
  const desktop = (
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
          {items.length === 0 ? (
            <TableEmptyRow colSpan={6}>{emptyMessage}</TableEmptyRow>
          ) : (
            items.map((task) => {
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
                    <Badge tone={taskStatusTone(task.status, Boolean(overdue))}>
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
  );

  const mobile =
    items.length === 0 ? (
      <ListCardEmpty>{emptyMessage}</ListCardEmpty>
    ) : (
      items.map((task) => {
        const linked = task.deal || task.contact || task.company;
        const overdue =
          task.status === "OPEN" && task.dueAt && task.dueAt < new Date();
        return (
          <ListCard key={task.id}>
            <ListCardHeader>
              <div className="min-w-0">
                <ListCardTitle>{task.title}</ListCardTitle>
                {task.priority ? (
                  <p className="mt-0.5 text-xs text-fg-muted">
                    {taskPriorityLabels[task.priority]}
                  </p>
                ) : null}
              </div>
              <Badge tone={taskStatusTone(task.status, Boolean(overdue))}>
                {taskStatusLabels[task.status]}
              </Badge>
            </ListCardHeader>
            <ListCardRows>
              <ListCardRow label="Vervaldatum">
                <span className={overdue ? "text-danger" : undefined}>
                  {task.dueAt ? formatDate(task.dueAt) : "—"}
                </span>
              </ListCardRow>
              <ListCardRow label="Gekoppeld">
                {linked ? linkedEntities(task) : "—"}
              </ListCardRow>
              <ListCardRow label="Toegewezen">
                <UserName
                  name={task.assignee.name}
                  image={task.assignee.image}
                  slug={task.assignee.slug}
                />
              </ListCardRow>
            </ListCardRows>
            {task.status === "OPEN" ? (
              <ListCardActions>
                <CompleteTaskButton taskId={task.id} />
              </ListCardActions>
            ) : null}
          </ListCard>
        );
      })
    );

  return <ResponsiveListView desktop={desktop} mobile={mobile} />;
}
