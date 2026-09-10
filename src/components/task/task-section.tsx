import Link from "next/link";
import { CollapsibleTaskForm } from "@/components/task/collapsible-task-form";
import { CompleteTaskButton } from "@/components/task/complete-task-button";
import { TaskForm } from "@/components/task/task-form";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import type { TaskRecord } from "@/lib/task-service";
import { taskPriorityLabels } from "@/lib/task-validation";
import { CompanyLink, ContactLink, DealLink } from "@/components/entity-links";
import { UserName } from "@/components/user/user-name";

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
  compact = false,
}: {
  tasks: TaskRecord[];
  currentUserId: string;
  assignees: Array<{ id: string; name: string; image?: string | null }>;
  dealId?: string | null;
  contactId?: string | null;
  companyId?: string | null;
  compact?: boolean;
}) {
  const form = compact ? (
    <CollapsibleTaskForm
      currentUserId={currentUserId}
      assignees={assignees}
      dealId={dealId}
      contactId={contactId}
      companyId={companyId}
    />
  ) : (
    <div className="rounded-md border border-border bg-surface p-3">
      <TaskForm
        currentUserId={currentUserId}
        assignees={assignees}
        dealId={dealId}
        contactId={contactId}
        companyId={companyId}
      />
    </div>
  );

  return (
    <section className="flex flex-col gap-2">
      <div className="flex min-h-7 items-center justify-between gap-2">
        <h2 className="text-label font-medium tracking-wide text-fg-muted uppercase">
          Taken
        </h2>
        <Link
          href="/taken"
          className="text-xs text-fg-muted hover:text-fg hover:underline"
        >
          Alle taken
        </Link>
      </div>
      {tasks.length === 0 ? (
        compact ? null : (
          <p className="text-sm text-fg-muted">Geen openstaande taken.</p>
        )
      ) : (
        <ul className="flex flex-col gap-1.5">
          {tasks.map((task) => {
            return (
              <li
                key={task.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-border bg-surface px-2.5 py-1.5"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-fg">{task.title}</p>
                  <p className="text-xs text-fg-muted">
                    <UserName
                      name={task.assignee.name}
                      image={task.assignee.image}
                      slug={task.assignee.slug}
                    />
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
      {form}
    </section>
  );
}
