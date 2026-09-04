import * as React from "react";
import { controlSize, fieldBase } from "@/components/ui/control-styles";
import { cn } from "@/lib/cn";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.ComponentProps<"select">
>(function Select({ className, children, ...props }, ref) {
  return (
    <select
      ref={ref}
      data-field-control=""
      className={cn("flex appearance-none bg-surface", fieldBase, controlSize.md, className)}
      {...props}
    >
      {children}
    </select>
  );
});
