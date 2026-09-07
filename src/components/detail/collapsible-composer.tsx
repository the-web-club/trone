"use client";

import { useCallback, useState } from "react";
import { Collapse } from "@/components/motion";
import { Button } from "@/components/ui/button";

export function CollapsibleComposer({
  label,
  children,
}: {
  label: string;
  children: (api: { close: () => void }) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="self-start text-fg-muted"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {open ? "Annuleren" : label}
      </Button>
      <Collapse open={open}>
        <div className="pb-1">{children({ close })}</div>
      </Collapse>
    </div>
  );
}
