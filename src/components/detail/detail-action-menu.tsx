"use client";

import { MoreHorizontal } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  PopoverContent,
  PopoverRoot,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/cn";

export const detailMenuItemClassName =
  "flex min-h-11 w-full items-center justify-start rounded-sm px-2 text-sm font-normal shadow-none hover:bg-hover";

export function DetailActionMenu({
  label = "Meer acties",
  children,
}: {
  label?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="ml-auto shrink-0">
      <PopoverRoot open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="secondary"
              size="icon"
              aria-label={label}
              aria-haspopup="dialog"
            />
          }
        >
          <MoreHorizontal className="size-4" aria-hidden />
        </PopoverTrigger>
        <PopoverContent align="end" side="bottom" className="w-52 p-1">
          <div className="flex flex-col" onClick={() => setOpen(false)}>
            {children}
          </div>
        </PopoverContent>
      </PopoverRoot>
    </div>
  );
}

export function detailMenuButtonClassName(destructive = false) {
  return cn(
    detailMenuItemClassName,
    "h-auto border-0 bg-transparent",
    destructive ? "text-danger hover:bg-danger-bg hover:text-danger" : "text-fg",
  );
}
