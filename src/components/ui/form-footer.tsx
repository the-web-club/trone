import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export function FormFooter({
  className,
  layout = "actions",
  ...props
}: ComponentProps<"div"> & {
  layout?: "actions" | "auto";
}) {
  return (
    <div
      data-layout={layout === "auto" ? "auto" : undefined}
      className={cn("form-footer", className)}
      {...props}
    />
  );
}
