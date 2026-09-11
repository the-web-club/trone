export default function TakenLoading() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true">
      <div className="h-8 w-32 animate-pulse rounded-sm bg-surface-sunk" />
      <div className="h-8 w-full max-w-2xl animate-pulse rounded-sm bg-surface-sunk" />
      <div className="h-64 animate-pulse rounded-md bg-surface-sunk" />
    </div>
  );
}
