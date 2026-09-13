import { type CreateTaskDealOption } from "@/components/task/create-task-list-dialog";
import {
  TasksListView,
  type TaskListRow,
} from "@/components/task/tasks-list-view";
import {
  formatTaskDue,
  isTaskOverdue,
  type TaskRecord,
} from "@/lib/task-service";
import { toTaskEditFormValues } from "@/lib/task-validation";

export function TasksList({
  items,
  deals,
  emptyMessage,
  emptyAction,
  canWrite,
}: {
  items: TaskRecord[];
  deals: CreateTaskDealOption[];
  emptyMessage: React.ReactNode;
  emptyAction?: React.ReactNode;
  canWrite: boolean;
}) {
  const rows: TaskListRow[] = items.map((task) => ({
    id: task.id,
    title: task.title,
    kind: task.kind,
    status: task.status,
    dueLabel: formatTaskDue(task),
    overdue: isTaskOverdue(task),
    deal: task.deal,
    contact: task.contact,
    company: task.company,
    assignee: task.assignee,
    edit: toTaskEditFormValues(task),
  }));

  return (
    <TasksListView
      rows={rows}
      deals={deals}
      emptyMessage={emptyMessage}
      emptyAction={emptyAction}
      canWrite={canWrite}
    />
  );
}
