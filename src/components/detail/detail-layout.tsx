import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function DetailColumns({
  left,
  right,
  className,
}: {
  left: ReactNode;
  right: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid items-start gap-10 lg:grid-cols-2",
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-8">{left}</div>
      <div className="flex min-w-0 flex-col gap-8">{right}</div>
    </div>
  );
}

export function DetailSection({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="page-header">
        <h2 className="text-md font-medium text-fg">{title}</h2>
        {action ? <div className="page-actions">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}
