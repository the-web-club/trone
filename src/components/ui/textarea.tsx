import * as React from "react";
import { fieldBase } from "@/components/ui/control-styles";
import { cn } from "@/lib/cn";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      data-field-control=""
      className={cn("min-h-20 px-2.5 py-2 text-sm", fieldBase, className)}
      {...props}
    />
  );
});
