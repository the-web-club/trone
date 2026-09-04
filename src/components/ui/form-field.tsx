import * as React from "react";
import { cn } from "@/lib/cn";

export function FormField({
  id,
  label,
  error,
  className,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <label htmlFor={id} className="text-label font-medium text-fg-muted">
        {label}
      </label>
      {React.isValidElement(children)
        ? React.cloneElement(
            children as React.ReactElement<Record<string, unknown>>,
            {
              id,
              "aria-invalid": error ? true : undefined,
            },
          )
        : children}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
