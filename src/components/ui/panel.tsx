import * as React from "react";
import { cn } from "@/lib/cn";

export const panelClassName = "rounded-md border border-border bg-surface p-4";

export function Panel({
  className,
  padded = true,
  ...props
}: React.ComponentProps<"div"> & { padded?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-md border border-border bg-surface",
        padded && "p-4",
        className,
      )}
      {...props}
    />
  );
}

export function FormMessage({
  error,
  success,
  className,
}: {
  error?: string | null;
  success?: string | null;
  className?: string;
}) {
  return (
    <p
      aria-live="polite"
      className={cn(
        "text-xs",
        error ? "text-danger" : "text-success",
        !error && !success && "hidden",
        className,
      )}
    >
      {error ?? success ?? ""}
    </p>
  );
}
