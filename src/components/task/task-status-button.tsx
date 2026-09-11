"use client";

import { useActionState } from "react";
import {
  completeTaskAction,
  reopenTaskAction,
} from "@/app/(beveiligd)/actions/task-actions";
import { Button } from "@/components/ui/button";

export function TaskStatusButton({
  taskId,
  status,
  canWrite,
}: {
  taskId: string;
  status: "OPEN" | "DONE" | "CANCELLED";
  canWrite: boolean;
}) {
  const action = status === "OPEN" ? completeTaskAction : reopenTaskAction;
  const [state, formAction, pending] = useActionState(action, null);

  if (!canWrite || status === "CANCELLED") return null;

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={taskId} />
      <Button type="submit" variant="secondary" size="xs" loading={pending}>
        {status === "OPEN" ? "Afronden" : "Heropenen"}
      </Button>
      {state?.error ? (
        <p className="mt-1 text-xs text-danger" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
