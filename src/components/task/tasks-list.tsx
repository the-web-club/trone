import { CompanyLink, ContactLink, DealLink } from "@/components/entity-links";
import { TaskStatusButton } from "@/components/task/task-status-button";
import { Badge } from "@/components/ui/badge";
import {
  ListCard,
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
import { cn } from "@/lib/cn";
import {
  formatTaskDue,
  isTaskOverdue,
  type TaskRecord,
} from "@/lib/task-service";
import {
  taskKindLabels,
  taskStatusLabels,
  taskStatusTones,
} from "@/lib/task-validation";

export function TasksList({
  items,
  emptyMessage,
  canWrite,
}: {
  items: TaskRecord[];
  emptyMessage: React.ReactNode;
  canWrite: boolean;
}) {
  const desktop = (
    <TableContainer>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHeaderCell>Taak</TableHeaderCell>
            <TableHeaderCell>Koppeling</TableHeaderCell>
            <TableHeaderCell>Toegewezen</TableHeaderCell>
            <TableHeaderCell>Datum</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell className="w-28"> </TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableEmptyRow colSpan={6}>{emptyMessage}</TableEmptyRow>
          ) : (
            items.map((task) => {
              const overdue = isTaskOverdue(task);
              return (
                <TableRow key={task.id}>
                  <TableCell>
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span
                        className={cn(
                          "font-medium",
                          task.status === "DONE" ? "text-fg-muted" : "text-fg",
                        )}
                      >
                        {task.title}
                      </span>
                      <span className="text-xs text-fg-muted">
                        {taskKindLabels[task.kind]}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-fg-muted">
                    <TaskLinks task={task} />
                  </TableCell>
                  <TableCell>
                    <UserName
                      name={task.assignee.name}
                      image={task.assignee.image}
                      slug={task.assignee.slug}
                    />
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-fg-muted",
                      overdue && "font-medium text-danger",
                    )}
                  >
                    {formatTaskDue(task)}
                    {overdue ? " · te laat" : null}
                  </TableCell>
                  <TableCell>
                    <Badge tone={taskStatusTones[task.status]}>
                      {taskStatusLabels[task.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <TaskStatusButton
                      taskId={task.id}
                      status={task.status}
                      canWrite={canWrite}
                    />
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
        const overdue = isTaskOverdue(task);
        return (
          <ListCard key={task.id}>
            <ListCardHeader>
              <ListCardTitle
                className={task.status === "DONE" ? "text-fg-muted" : undefined}
              >
                {task.title}
              </ListCardTitle>
              <Badge tone={taskStatusTones[task.status]}>
                {taskStatusLabels[task.status]}
              </Badge>
            </ListCardHeader>
            <ListCardRows>
              <ListCardRow label="Type">{taskKindLabels[task.kind]}</ListCardRow>
              <ListCardRow label="Koppeling">
                <TaskLinks task={task} />
              </ListCardRow>
              <ListCardRow label="Toegewezen">
                <UserName
                  name={task.assignee.name}
                  image={task.assignee.image}
                  slug={task.assignee.slug}
                />
              </ListCardRow>
              <ListCardRow label="Datum">
                <span className={cn(overdue && "font-medium text-danger")}>
                  {formatTaskDue(task)}
                  {overdue ? " · te laat" : null}
                </span>
              </ListCardRow>
            </ListCardRows>
            <div className="mt-2">
              <TaskStatusButton
                taskId={task.id}
                status={task.status}
                canWrite={canWrite}
              />
            </div>
          </ListCard>
        );
      })
    );

  return <ResponsiveListView desktop={desktop} mobile={mobile} />;
}

function TaskLinks({ task }: { task: TaskRecord }) {
  const parts = [
    task.deal ? <DealLink key="deal" deal={task.deal} /> : null,
    task.contact ? <ContactLink key="contact" contact={task.contact} /> : null,
    task.company ? <CompanyLink key="company" company={task.company} /> : null,
  ].filter(Boolean);

  if (parts.length === 0) return <>—</>;

  return <span className="flex flex-col gap-0.5">{parts}</span>;
}
