import * as React from "react";
import { cn } from "@/lib/cn";

export const Card = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(function Card({ className, ...props }, ref) {
  return (
    <div
      ref={ref}
      className={cn(
        "rounded-md border border-border bg-surface p-3 shadow-[var(--shadow-xs)]",
        className,
      )}
      {...props}
    />
  );
});
