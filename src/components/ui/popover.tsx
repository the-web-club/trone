"use client";

import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import * as React from "react";
import { popupMotion, popupSurface } from "@/components/ui/control-styles";
import { cn } from "@/lib/cn";

export const PopoverRoot = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverClose = PopoverPrimitive.Close;
export const PopoverTitle = PopoverPrimitive.Title;
export const PopoverDescription = PopoverPrimitive.Description;

export function PopoverContent({
  className,
  children,
  side = "bottom",
  align = "start",
  sideOffset = 6,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Popup> & {
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  sideOffset?: number;
}) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner
        side={side}
        align={align}
        sideOffset={sideOffset}
        collisionPadding={8}
        className="z-[var(--z-dropdown)] outline-none"
      >
        <PopoverPrimitive.Popup
          className={cn(
            popupSurface,
            popupMotion,
            "max-h-[min(28rem,var(--available-height))] w-[min(20rem,var(--available-width))] overflow-y-auto overscroll-contain p-3",
            className,
          )}
          {...props}
        >
          {children}
        </PopoverPrimitive.Popup>
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  );
}
