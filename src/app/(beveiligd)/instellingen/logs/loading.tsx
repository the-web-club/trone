/** Skeleton voor Instellingen > Logs; zelfde opzet als leads/(index)/loading.tsx. */
export default function LogsLoading() {
  return (
    <div className="flex flex-col gap-4" aria-busy>
      <div className="flex flex-col gap-2">
        <div className="h-3 w-40 animate-pulse rounded-sm bg-surface-sunk" />
        <div className="h-6 w-24 animate-pulse rounded-sm bg-surface-sunk" />
        <div className="h-3 w-64 animate-pulse rounded-sm bg-surface-sunk" />
      </div>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-8 w-32 animate-pulse rounded-sm bg-surface-sunk"
          />
        ))}
      </div>
      <div className="flex flex-col gap-1.5">
        {Array.from({ length: 12 }).map((_, index) => (
          <div
            key={index}
            className="h-11 w-full animate-pulse rounded-sm bg-surface-sunk"
          />
        ))}
      </div>
      <span className="sr-only">Logs worden geladen…</span>
    </div>
  );
}
