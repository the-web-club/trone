"use client";

import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/cn";

export const DialogRoot = Dialog.Root;
export const DialogTrigger = Dialog.Trigger;
export const DialogClose = Dialog.Close;

const dialogSizes = {
  sm: "max-w-[24rem]",
  md: "max-w-[30rem]",
  lg: "max-w-[36rem]",
} as const;

export function DialogContent({
  className,
  size = "md",
  children,
  ...props
}: React.ComponentProps<typeof Dialog.Popup> & {
  size?: keyof typeof dialogSizes;
}) {
  return (
    <Dialog.Portal>
      <Dialog.Backdrop className="fixed inset-0 z-[var(--z-overlay)] bg-fg/25 transition-opacity duration-[var(--motion-overlay)] ease-[var(--ease-enter)] data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
      <Dialog.Viewport className="fixed inset-0 z-[var(--z-modal)] flex items-start justify-center overflow-y-auto p-4 sm:items-center sm:p-6">
        <Dialog.Popup
          className={cn(
            "my-auto flex max-h-[calc(100dvh-2rem)] w-full flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-[var(--shadow-pop)] outline-none",
            "transition-[opacity,transform] duration-[var(--motion-overlay)] ease-[var(--ease-enter)]",
            "data-[starting-style]:translate-y-1 data-[starting-style]:opacity-0",
            "data-[ending-style]:translate-y-1 data-[ending-style]:opacity-0",
            dialogSizes[size],
            className,
          )}
          {...props}
        >
          {children}
        </Dialog.Popup>
      </Dialog.Viewport>
    </Dialog.Portal>
  );
}

export function DialogHeader({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div className={cn("flex items-start gap-3 px-4 pt-3.5 pb-2.5", className)} {...props}>
      <div className="min-w-0 flex-1 space-y-0.5">{children}</div>
      <Dialog.Close
        aria-label="Sluiten"
        className="-mt-0.5 -mr-1 inline-flex size-6 shrink-0 items-center justify-center rounded-sm text-fg-subtle transition-[color,background-color] duration-[var(--motion-fast)] ease-[var(--ease-standard)] hover:bg-hover hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
      >
        <X className="size-3.5" aria-hidden />
      </Dialog.Close>
    </div>
  );
}

export function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof Dialog.Title>) {
  return (
    <Dialog.Title
      className={cn(
        "text-[15px] leading-tight font-medium tracking-tight text-fg",
        className,
      )}
      {...props}
    />
  );
}

export function DialogBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("min-h-0 flex-1 overflow-y-auto px-4 pb-1", className)}
      {...props}
    />
  );
}

export function DialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex shrink-0 flex-wrap items-center justify-end gap-2 px-4 pt-3 pb-3.5",
        className,
      )}
      {...props}
    />
  );
}
