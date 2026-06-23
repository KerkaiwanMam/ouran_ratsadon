// Skeleton loading placeholders — content-shaped shimmer blocks that hold the
// layout while data loads, instead of a centered spinner. Reduces perceived
// latency and prevents layout shift (Client Optimization, Frontend Track).
// The shimmer keyframe + reduced-motion handling live in globals.css (.skeleton).

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`skeleton ${className}`} />;
}

/** Row of KPI cards matching the /dashboard + /analytics KPI grid. */
export function KpiCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="surface-glass rounded-2xl px-5 py-5 min-h-[132px] flex flex-col gap-3"
        >
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-8 w-28" />
          <div className="mt-auto flex justify-end">
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** A glass panel with a header + a large chart-area block. */
export function ChartPanelSkeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`surface-glass rounded-2xl p-6 ${className}`}>
      <Skeleton className="h-4 w-40 mb-2" />
      <Skeleton className="h-3 w-56 mb-5" />
      <Skeleton className="w-full h-[240px] rounded-xl" />
    </div>
  );
}

/** Skeleton table body — drops straight into an existing card/table container. */
export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="p-4 space-y-3.5">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className={`h-4 ${c === 1 ? "flex-1" : "w-20"}`} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Stacked card rows — for list/checklist views (e.g. /action-items). */
export function ListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="surface-glass rounded-2xl p-4 flex items-start gap-3">
          <Skeleton className="w-5 h-5 rounded-full shrink-0" />
          <div className="flex-1 space-y-2.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          <Skeleton className="w-4 h-4 shrink-0" />
        </div>
      ))}
    </div>
  );
}
