"use client";

import { Drawer } from "@base-ui/react/drawer";
import { X } from "lucide-react";
import * as React from "react";
import {
  controlMotion,
  drawerBackdropMotion,
  drawerPopupMotion,
} from "@/components/motion/styles";
import { cn } from "@/lib/cn";

export const DrawerRoot = Drawer.Root;
export const DrawerTrigger = Drawer.Trigger;
export const DrawerClose = Drawer.Close;

const mobileDrawerLayer =
  "fixed top-0 right-0 left-0 w-full max-w-none mx-0 bottom-[var(--mobile-bottom-nav-total-height)]";

export function DrawerSheet({
  className,
  children,
  ...props
}: React.ComponentProps<typeof Drawer.Popup>) {
  return (
    <Drawer.Portal>
      <Drawer.Backdrop
        className={cn(
          mobileDrawerLayer,
          "z-[var(--z-mobile-backdrop)] bg-overlay",
          drawerBackdropMotion,
        )}
      />
      <Drawer.Viewport
        className={cn(
          mobileDrawerLayer,
          "z-[var(--z-mobile-drawer)] flex flex-col justify-end overflow-x-clip overflow-y-hidden overscroll-none pointer-events-none",
        )}
      >
        <Drawer.Popup
          className={cn(
            "pointer-events-auto flex h-auto w-full min-h-0 max-h-full max-w-none min-w-0 flex-col overflow-x-clip overflow-y-hidden rounded-t-[24px] rounded-b-none border-t border-border bg-surface-raised shadow-none outline-none",
            drawerPopupMotion,
            className,
          )}
          {...props}
        >
          {children}
        </Drawer.Popup>
      </Drawer.Viewport>
    </Drawer.Portal>
  );
}

export function DrawerHandle({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex w-full shrink-0 items-center justify-center",
        className,
      )}
      aria-hidden
    >
      <span className="flex min-h-12 w-full items-center justify-center">
        <span className="h-1 w-10 rounded-full bg-fg-subtle/40" />
      </span>
    </div>
  );
}

export function DrawerHeader({
  className,
  children,
  dismissible = true,
  ...props
}: React.ComponentProps<"div"> & { dismissible?: boolean }) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-3 px-4 pb-2",
        className,
      )}
      {...props}
    >
      <div className="min-w-0 flex-1">{children}</div>
      {dismissible ? (
        <Drawer.Close
          aria-label="Sluiten"
          className={cn(
            "-mr-1 inline-flex size-11 shrink-0 items-center justify-center rounded-sm text-fg-subtle hover:bg-hover hover:text-fg active:bg-selected",
            controlMotion,
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg",
          )}
        >
          <X className="size-3.5" aria-hidden />
        </Drawer.Close>
      ) : null}
    </div>
  );
}

export function DrawerTitle({
  className,
  ...props
}: React.ComponentProps<typeof Drawer.Title>) {
  return (
    <Drawer.Title
      className={cn(
        "text-[15px] leading-tight font-medium tracking-tight text-fg",
        className,
      )}
      {...props}
    />
  );
}

export function DrawerDescription({
  className,
  ...props
}: React.ComponentProps<typeof Drawer.Description>) {
  return (
    <Drawer.Description className={cn("sr-only", className)} {...props} />
  );
}

export function DrawerBody({
  className,
  ...props
}: React.ComponentProps<typeof Drawer.Content>) {
  return (
    <Drawer.Content
      className={cn(
        "min-h-0 flex-1 overflow-y-auto overscroll-contain",
        className,
      )}
      {...props}
    />
  );
}
