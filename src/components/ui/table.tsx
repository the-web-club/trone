"use client";

import * as React from "react";
import { Stagger, StaggerItem } from "@/components/motion";
import { controlMotion } from "@/components/motion/styles";
import { cn } from "@/lib/cn";

export function TableContainer({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return <div className={cn("data-table", className)} {...props} />;
}

export function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <table
      className={cn("min-w-full border-collapse text-left text-sm", className)}
      {...props}
    />
  );
}

export function TableHeader({
  className,
  ...props
}: React.ComponentProps<"thead">) {
  return (
    <thead
      className={cn("[&_tr]:border-b [&_tr]:border-border", className)}
      {...props}
    />
  );
}

export function TableBody({
  className,
  children,
}: React.ComponentProps<"tbody">) {
  return (
    <Stagger as="tbody" className={cn("[&>tr:last-child]:border-0", className)}>
      {children}
    </Stagger>
  );
}

export function TableRow({
  className,
  interactive = false,
  ...props
}: React.ComponentProps<"tr"> & { interactive?: boolean }) {
  return (
    <StaggerItem
      as="tr"
      className={cn(
        "group/row border-b border-border",
        controlMotion,
        interactive && "hover:bg-hover-subtle",
        className,
      )}
      {...props}
    />
  );
}

export function TableHeaderCell({
  className,
  align = "left",
  ...props
}: React.ComponentProps<"th"> & { align?: "left" | "right" | "center" }) {
  return (
    <th
      scope="col"
      className={cn(
        "h-8 px-3 text-label font-medium whitespace-nowrap text-fg-muted",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className,
      )}
      {...props}
    />
  );
}

export function TableCell({
  className,
  align = "left",
  ...props
}: React.ComponentProps<"td"> & { align?: "left" | "right" | "center" }) {
  return (
    <td
      className={cn(
        "px-3 py-2 align-middle text-fg",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className,
      )}
      {...props}
    />
  );
}

export function TableEmptyRow({
  colSpan,
  children,
  className,
}: {
  colSpan: number;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className={cn("px-3 py-6 text-center text-sm text-fg-muted", className)}
      >
        {children}
      </td>
    </tr>
  );
}
