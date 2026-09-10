"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
} from "react";
import { SavedIndicator } from "@/components/detail/saved-indicator";
import { useSavedFlash } from "@/components/detail/use-saved-flash";
import { focusRingOutline } from "@/components/ui/control-styles";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import { formatPersonName } from "@/lib/format";

const titleInputClassName =
  "h-auto min-w-[6rem] flex-1 border-transparent bg-transparent px-1 py-0 text-[length:inherit] leading-[inherit] tracking-[inherit] shadow-none";

export function ContactNameTitle({
  firstName,
  lastName,
  onSave,
}: {
  firstName: string;
  lastName: string;
  onSave: (next: {
    firstName: string;
    lastName: string;
  }) => Promise<string | null>;
}) {
  const firstId = useId();
  const lastId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const firstRef = useRef<HTMLInputElement>(null);
  const cancelledRef = useRef(false);
  const [editing, setEditing] = useState(false);
  const [draftFirst, setDraftFirst] = useState(firstName);
  const [draftLast, setDraftLast] = useState(lastName);
  const [committedFirst, setCommittedFirst] = useState(firstName);
  const [committedLast, setCommittedLast] = useState(lastName);
  const [fromServerFirst, setFromServerFirst] = useState(firstName);
  const [fromServerLast, setFromServerLast] = useState(lastName);
  const [error, setError] = useState<string | null>(null);
  const { visible: saved, flash } = useSavedFlash();

  if (firstName !== fromServerFirst) {
    setFromServerFirst(firstName);
    setCommittedFirst(firstName);
    if (!editing) setDraftFirst(firstName);
  }
  if (lastName !== fromServerLast) {
    setFromServerLast(lastName);
    setCommittedLast(lastName);
    if (!editing) setDraftLast(lastName);
  }

  useEffect(() => {
    if (!editing) return;
    firstRef.current?.focus();
    firstRef.current?.select();
  }, [editing]);

  function startEditing() {
    setDraftFirst(committedFirst);
    setDraftLast(committedLast);
    setError(null);
    cancelledRef.current = false;
    setEditing(true);
  }

  async function commit() {
    const nextFirst = draftFirst.trim();
    const nextLast = draftLast.trim();
    if (nextFirst === committedFirst.trim() && nextLast === committedLast.trim()) {
      setEditing(false);
      setError(null);
      return;
    }
    if (nextFirst === "") {
      setError("Voornaam is verplicht");
      return;
    }

    const previousFirst = committedFirst;
    const previousLast = committedLast;
    setCommittedFirst(nextFirst);
    setCommittedLast(nextLast);
    setEditing(false);
    setError(null);

    const result = await onSave({ firstName: nextFirst, lastName: nextLast });
    if (result) {
      setCommittedFirst(previousFirst);
      setCommittedLast(previousLast);
      setDraftFirst(draftFirst);
      setDraftLast(draftLast);
      setEditing(true);
      setError(result);
      return;
    }
    flash();
  }

  function cancel() {
    cancelledRef.current = true;
    setDraftFirst(committedFirst);
    setDraftLast(committedLast);
    setError(null);
    setEditing(false);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      cancel();
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      void commit();
    }
  }

  function onBlur(event: FocusEvent<HTMLInputElement>) {
    if (cancelledRef.current) {
      cancelledRef.current = false;
      return;
    }
    const next = event.relatedTarget;
    if (next instanceof Node && containerRef.current?.contains(next)) return;
    void commit();
  }

  const displayName = formatPersonName(committedFirst, committedLast || null);

  return (
    <div ref={containerRef} className="min-w-0 w-full">
      <label htmlFor={firstId} className="sr-only">
        Voornaam
      </label>
      <label htmlFor={lastId} className="sr-only">
        Achternaam
      </label>
      {editing ? (
        <h1 className="page-header-title">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Input
              ref={firstRef}
              id={firstId}
              value={draftFirst}
              placeholder="Voornaam"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${firstId}-error` : undefined}
              onChange={(event) => setDraftFirst(event.target.value)}
              onKeyDown={onKeyDown}
              onBlur={onBlur}
              className={titleInputClassName}
            />
            <Input
              id={lastId}
              value={draftLast}
              placeholder="Achternaam"
              aria-invalid={error ? true : undefined}
              onChange={(event) => setDraftLast(event.target.value)}
              onKeyDown={onKeyDown}
              onBlur={onBlur}
              className={titleInputClassName}
            />
          </span>
        </h1>
      ) : (
        <h1 className="page-header-title">
          <button
            type="button"
            aria-label="Naam bewerken"
            onClick={startEditing}
            className={cn(
              "-mx-1 max-w-full rounded-sm px-1 text-left",
              "inline-editable hover:bg-hover",
              focusRingOutline,
            )}
          >
            {displayName}
          </button>
        </h1>
      )}
      {error ? (
        <p id={`${firstId}-error`} className="text-xs text-danger" role="alert">
          {error}
        </p>
      ) : saved ? (
        <SavedIndicator visible />
      ) : null}
    </div>
  );
}
