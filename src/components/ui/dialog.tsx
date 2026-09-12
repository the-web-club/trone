"use client";

import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import * as React from "react";
import {
  controlMotion,
  dialogBackdropMotion,
  dialogPopupMotion,
} from "@/components/motion/styles";
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
      <Dialog.Backdrop
        className={cn(
          "fixed inset-0 z-[var(--z-overlay)] bg-fg/25",
          dialogBackdropMotion,
        )}
      />
      <Dialog.Viewport className="fixed inset-0 z-[var(--z-modal)] flex items-end justify-center overflow-y-auto p-0 pb-[var(--bottom-nav-h)] sm:items-center sm:px-6 sm:pt-6 desktop-nav:pb-6">
        <Dialog.Popup
          className={cn(
            "my-auto flex max-h-[calc(100dvh-env(safe-area-inset-top)-var(--bottom-nav-h))] w-full flex-col overflow-hidden rounded-t-lg border border-border bg-surface shadow-[var(--shadow-pop)] outline-none sm:max-h-[calc(100dvh-3rem)] sm:rounded-lg",
            dialogPopupMotion,
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
        className={cn(
          "-mt-0.5 -mr-1 inline-flex size-11 shrink-0 items-center justify-center rounded-sm text-fg-subtle hover:bg-hover hover:text-fg sm:size-8",
          controlMotion,
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg",
        )}
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
  layout = "actions",
  ...props
}: React.ComponentProps<"div"> & {
  layout?: "actions" | "auto";
}) {
  return (
    <div
      data-layout={layout === "auto" ? "auto" : undefined}
      className={cn(
        "dialog-footer shrink-0 px-4 pt-3 pb-3.5",
        className,
      )}
      {...props}
    />
  );
}
