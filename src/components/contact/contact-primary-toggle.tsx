"use client";

import { useState } from "react";
import { detailMenuButtonClassName } from "@/components/detail/detail-action-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export function ContactPrimaryToggle({
  isPrimary,
  onSave,
  presentation = "button",
}: {
  isPrimary: boolean;
  onSave: (next: boolean) => Promise<string | null>;
  presentation?: "button" | "menu";
}) {
  const [current, setCurrent] = useState(isPrimary);
  const [fromServer, setFromServer] = useState(isPrimary);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMenu = presentation === "menu";

  if (isPrimary !== fromServer) {
    setFromServer(isPrimary);
    if (!pending) setCurrent(isPrimary);
  }

  async function toggle() {
    const next = !current;
    const previous = current;
    setCurrent(next);
    setPending(true);
    setError(null);
    const result = await onSave(next);
    setPending(false);
    if (result) {
      setCurrent(previous);
      setError(result);
    }
  }

  return (
    <div className={isMenu ? "w-full" : undefined}>
      <Button
        type="button"
        variant={isMenu ? "ghost" : "secondary"}
        loading={pending}
        aria-pressed={current}
        onClick={() => void toggle()}
        className={
          isMenu
            ? detailMenuButtonClassName()
            : cn(
                current &&
                  "border-transparent bg-info-bg text-info shadow-none hover:bg-info-bg hover:text-info",
              )
        }
      >
        {current
          ? isMenu
            ? "Primair uitzetten"
            : "Primair"
          : "Maak primair"}
      </Button>
      {error ? (
        <p className="mt-1 px-2 text-xs text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
