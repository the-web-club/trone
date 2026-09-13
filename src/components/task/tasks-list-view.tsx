"use client";

import { useState } from "react";
import { CompanyLink, ContactLink, DealLink } from "@/components/entity-links";
import { type CreateTaskDealOption } from "@/components/task/create-task-list-dialog";
import { EditTaskListDialog } from "@/components/task/edit-task-list-dialog";
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
  type TaskEditFormValues,
  type TaskKind,
  type TaskStatusValue,
  taskKindLabels,
  taskStatusLabels,
  taskStatusTones,
} from "@/lib/task-validation";

export type TaskListRow = {
  id: string;
  title: string;
  kind: TaskKind;
  status: TaskStatusValue;
  dueLabel: string;
  overdue: boolean;
  deal: { id: string; slug: string; title: string } | null;
  contact: {
    id: string;
    slug: string;
    firstName: string;
    lastName: string | null;
  } | null;
  company: { id: string; slug: string; name: string } | null;
  assignee: { name: string; image: string | null; slug: string | null };
  edit: TaskEditFormValues;
};

export function TasksListView({
  rows,
  deals,
  emptyMessage,
  emptyAction,
  canWrite,
}: {
  rows: TaskListRow[];
  deals: CreateTaskDealOption[];
  emptyMessage: React.ReactNode;
  emptyAction?: React.ReactNode;
  canWrite: boolean;
}) {
  const [editing, setEditing] = useState<TaskEditFormValues | null>(null);

  function openTask(task: TaskEditFormValues) {
    if (!canWrite) return;
    setEditing(task);
  }

  function shouldIgnoreRowClick(target: EventTarget | null) {
    return (
      target instanceof Element &&
      Boolean(target.closest("a, button, input, textarea, select, form"))
    );
  }

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
          {rows.length === 0 ? (
            <TableEmptyRow colSpan={6}>
              {emptyMessage}
              {emptyAction}
            </TableEmptyRow>
          ) : (
            rows.map((task) => (
              <TableRow
                key={task.id}
                interactive={canWrite}
                className={canWrite ? "cursor-pointer" : undefined}
                tabIndex={canWrite ? 0 : undefined}
                onClick={(event) => {
                  if (shouldIgnoreRowClick(event.target)) return;
                  openTask(task.edit);
                }}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" && event.key !== " ") return;
                  if (event.target !== event.currentTarget) return;
                  event.preventDefault();
                  openTask(task.edit);
                }}
              >
                <TableCell>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    {canWrite ? (
                      <button
                        type="button"
                        className={cn(
                          "text-left font-medium hover:underline",
                          task.status === "DONE" ? "text-fg-muted" : "text-fg",
                        )}
                        onClick={() => openTask(task.edit)}
                      >
                        {task.title}
                      </button>
                    ) : (
                      <span
                        className={cn(
                          "font-medium",
                          task.status === "DONE" ? "text-fg-muted" : "text-fg",
                        )}
                      >
                        {task.title}
                      </span>
                    )}
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
                    task.overdue && "font-medium text-danger",
                  )}
                >
                  {task.dueLabel}
                  {task.overdue ? " · te laat" : null}
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
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const mobile =
    rows.length === 0 ? (
      <ListCardEmpty>
        {emptyMessage}
        {emptyAction}
      </ListCardEmpty>
    ) : (
      rows.map((task) => (
        <ListCard
          key={task.id}
          onClick={
            canWrite
              ? (event) => {
                  if (shouldIgnoreRowClick(event.target)) return;
                  openTask(task.edit);
                }
              : undefined
          }
        >
          <ListCardHeader>
            {canWrite ? (
              <ListCardTitle
                className={task.status === "DONE" ? "text-fg-muted" : undefined}
              >
                <button
                  type="button"
                  className="text-left hover:underline"
                  onClick={() => openTask(task.edit)}
                >
                  {task.title}
                </button>
              </ListCardTitle>
            ) : (
              <ListCardTitle
                className={task.status === "DONE" ? "text-fg-muted" : undefined}
              >
                {task.title}
              </ListCardTitle>
            )}
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
              <span className={cn(task.overdue && "font-medium text-danger")}>
                {task.dueLabel}
                {task.overdue ? " · te laat" : null}
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
      ))
    );

  return (
    <>
      <ResponsiveListView desktop={desktop} mobile={mobile} />
      {editing ? (
        <EditTaskListDialog
          key={editing.id}
          task={editing}
          deals={deals}
          open
          onOpenChange={(next) => {
            if (!next) setEditing(null);
          }}
        />
      ) : null}
    </>
  );
}

function TaskLinks({
  task,
}: {
  task: Pick<TaskListRow, "deal" | "contact" | "company">;
}) {
  const parts = [
    task.deal ? <DealLink key="deal" deal={task.deal} /> : null,
    task.contact ? <ContactLink key="contact" contact={task.contact} /> : null,
    task.company ? <CompanyLink key="company" company={task.company} /> : null,
  ].filter(Boolean);

  if (parts.length === 0) return <>—</>;

  return <span className="flex flex-col gap-0.5">{parts}</span>;
}
