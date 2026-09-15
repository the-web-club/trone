"use client";

export function FormStatus({
  error,
  statusMessage,
}: {
  error?: string | null;
  statusMessage?: string | null;
}) {
  return (
    <>
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      <p className="sr-only" aria-live="polite">
        {statusMessage ?? error ?? ""}
      </p>
    </>
  );
}
