"use client";

import { useActionState, useState } from "react";
import { createWorkLogAction } from "@/app/(beveiligd)/actions/worklog-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  WorkLogLinkFields,
  type WorkLogCompanyOption,
  type WorkLogOrderOption,
} from "@/components/worklog/work-log-link-fields";
import { cn } from "@/lib/cn";
import {
  workLogCategories,
  workLogCategoryLabels,
} from "@/lib/worklog-validation";

function toDateTimeLocal(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function WorkLogForm({
  companies,
  orders,
  defaultCompanyId,
  defaultOrderId,
  lockCompany,
  lockOrder,
}: {
  companies: WorkLogCompanyOption[];
  orders: WorkLogOrderOption[];
  defaultCompanyId?: string;
  defaultOrderId?: string;
  lockCompany?: boolean;
  lockOrder?: boolean;
}) {
  const [state, formAction, pending] = useActionState(createWorkLogAction, null);

  return (
    <form
      key={state?.loggedAt ?? "new"}
      action={formAction}
      className="flex flex-col gap-3"
    >
      <WorkLogFormFields
        companies={companies}
        orders={orders}
        defaultCompanyId={defaultCompanyId}
        defaultOrderId={defaultOrderId}
        lockCompany={lockCompany}
        lockOrder={lockOrder}
        pending={pending}
      />
      {state?.error ? (
        <p className="text-sm text-danger" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

function WorkLogFormFields({
  companies,
  orders,
  defaultCompanyId,
  defaultOrderId,
  lockCompany,
  lockOrder,
  pending,
}: {
  companies: WorkLogCompanyOption[];
  orders: WorkLogOrderOption[];
  defaultCompanyId?: string;
  defaultOrderId?: string;
  lockCompany?: boolean;
  lockOrder?: boolean;
  pending: boolean;
}) {
  const [category, setCategory] = useState("OVERIG");
  const [showWhen, setShowWhen] = useState(false);

  return (
    <>
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <Input
          name="description"
          placeholder="Wat heb je gedaan?"
          required
          autoComplete="off"
          className="lg:flex-1"
        />
        <Button type="submit" loading={pending} className="lg:w-auto">
          Loggen
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {workLogCategories.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setCategory(value)}
            className={cn(
              "h-7 rounded-sm border px-2 text-xs font-medium transition-[color,background-color,border-color] duration-[var(--motion-fast)]",
              category === value
                ? "border-accent bg-selected-bg text-fg"
                : "border-border bg-surface text-fg-muted hover:border-border-strong hover:bg-hover",
            )}
          >
            {workLogCategoryLabels[value]}
          </button>
        ))}
        <input type="hidden" name="category" value={category} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          name="durationMinutes"
          type="number"
          min={1}
          max={10080}
          inputSize="sm"
          placeholder="Duur (min)"
          className="w-28"
        />

        {showWhen ? (
          <Input
            name="occurredAt"
            type="datetime-local"
            inputSize="sm"
            defaultValue={toDateTimeLocal(new Date())}
            className="w-52"
          />
        ) : (
          <button
            type="button"
            className="h-7 text-xs text-fg-muted hover:text-fg"
            onClick={() => setShowWhen(true)}
          >
            Nu · datum aanpassen
          </button>
        )}

        <WorkLogLinkFields
          companies={companies}
          orders={orders}
          defaultCompanyId={defaultCompanyId}
          defaultOrderId={defaultOrderId}
          lockCompany={lockCompany}
          lockOrder={lockOrder}
        />
      </div>
    </>
  );
}
