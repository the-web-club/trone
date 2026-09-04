"use client";

import { useActionState } from "react";
import { completeTaskAction } from "@/app/(beveiligd)/actions/task-actions";
import { Button } from "@/components/ui/button";

export function CompleteTaskButton({
  taskId,
  label = "Afronden",
}: {
  taskId: string;
  label?: string;
}) {
  const [state, formAction, pending] = useActionState(completeTaskAction, null);

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={taskId} />
      <Button type="submit" variant="secondary" size="sm" loading={pending}>
        {label}
      </Button>
      {state?.error ? (
        <p className="mt-1 text-xs text-danger" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
