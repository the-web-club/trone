import Link from "next/link";
import { CompleteTaskButton } from "@/components/task/complete-task-button";
import { TaskForm } from "@/components/task/task-form";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import type { TaskRecord } from "@/lib/task-service";
import { taskPriorityLabels } from "@/lib/task-validation";
import { CompanyLink, ContactLink, DealLink } from "@/components/entity-links";

function isOverdue(dueAt: Date | null) {
  if (!dueAt) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return dueAt < today;
}

export function TaskSection({
  tasks,
  currentUserId,
  assignees,
  dealId,
  contactId,
  companyId,
}: {
  tasks: TaskRecord[];
  currentUserId: string;
  assignees: Array<{ id: string; name: string }>;
  dealId?: string | null;
  contactId?: string | null;
  companyId?: string | null;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="page-header">
        <h2 className="text-md font-medium text-fg">Taken</h2>
        <Link href="/taken" className="text-sm text-fg-muted hover:underline">
          Alle taken
        </Link>
      </div>
      {tasks.length === 0 ? (
        <p className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg-muted">
          Geen openstaande taken.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {tasks.map((task) => {
            return (
              <li
                key={task.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-surface px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-fg">{task.title}</p>
                  <p className="text-xs text-fg-muted">
                    {task.assignee.name}
                    {task.dueAt ? (
                      <>
                        {" · "}
                        <span className={isOverdue(task.dueAt) ? "text-danger" : undefined}>
                          {formatDate(task.dueAt)}
                        </span>
                      </>
                    ) : null}
                    {task.contact ? (
                      <>
                        {" · "}
                        <ContactLink contact={task.contact} />
                      </>
                    ) : null}
                    {task.company ? (
                      <>
                        {" · "}
                        <CompanyLink company={task.company} />
                      </>
                    ) : null}
                    {task.deal ? (
                      <>
                        {" · "}
                        <DealLink deal={task.deal} />
                      </>
                    ) : null}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {task.priority ? (
                    <Badge
                      tone={task.priority === "HIGH" ? "warning" : "default"}
                    >
                      {taskPriorityLabels[task.priority]}
                    </Badge>
                  ) : null}
                  <CompleteTaskButton taskId={task.id} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <div className="rounded-md border border-border bg-surface p-3">
        <TaskForm
          currentUserId={currentUserId}
          assignees={assignees}
          dealId={dealId}
          contactId={contactId}
          companyId={companyId}
        />
      </div>
    </section>
  );
}
