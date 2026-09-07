"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export function ContactPrimaryToggle({
  isPrimary,
  onSave,
}: {
  isPrimary: boolean;
  onSave: (next: boolean) => Promise<string | null>;
}) {
  const [current, setCurrent] = useState(isPrimary);
  const [fromServer, setFromServer] = useState(isPrimary);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <div>
      <Button
        type="button"
        variant="secondary"
        loading={pending}
        aria-pressed={current}
        onClick={() => void toggle()}
        className={cn(
          current &&
            "border-transparent bg-info-bg text-info shadow-none hover:bg-info-bg hover:text-info",
        )}
      >
        {current ? "Primair" : "Maak primair"}
      </Button>
      {error ? (
        <p className="mt-1 text-xs text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
