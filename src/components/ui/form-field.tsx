import * as React from "react";
import { cn } from "@/lib/cn";

export function FormFieldGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("form-field-grid", className)}>{children}</div>
  );
}

export function FormField({
  id,
  label,
  aside,
  error,
  className,
  children,
}: {
  id: string;
  label: string;
  aside?: React.ReactNode;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-label font-medium text-fg-muted">
          {label}
        </label>
        {aside}
      </div>
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
