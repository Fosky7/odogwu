export type SkeletonProps = {
  className?: string;
};

/**
 * Base loading placeholder. Every skeleton is decorative, so it is hidden from
 * assistive technology while the real content is still loading.
 */
export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-md bg-muted ${className}`.trim()}
    />
  );
}

export type TextSkeletonProps = {
  lines?: number;
  className?: string;
};

/** A short stack of lines that mimics paragraph text while data loads. */
export function TextSkeleton({ lines = 3, className = "" }: TextSkeletonProps) {
  return (
    <div aria-hidden="true" className={`space-y-2 ${className}`.trim()}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          className={`h-3 ${index === lines - 1 ? "w-2/3" : "w-full"}`}
        />
      ))}
    </div>
  );
}

export type ListSkeletonProps = {
  rows?: number;
};

/** Reusable row placeholders for dashboards and request lists. */
export function ListSkeleton({ rows = 3 }: ListSkeletonProps) {
  return (
    <div aria-hidden="true" className="space-y-4">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="rounded-xl border border-border bg-card p-4 shadow-sm"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="w-full space-y-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-3/4" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Placeholder for a single verified-bill card on the feed. */
export function FeedCardSkeleton() {
  return (
    <div
      data-testid="feed-card-skeleton"
      aria-hidden="true"
      className="rounded-2xl border border-border bg-card p-6 shadow-sm"
    >
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>

      <Skeleton className="mt-4 h-4 w-32" />
      <Skeleton className="mt-3 h-7 w-48" />
      <Skeleton className="mt-2 h-4 w-40" />
      <Skeleton className="mt-6 h-9 w-28" />

      <div className="mt-4 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-3/4" />
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="mt-2 h-2 w-full rounded-full" />
        <Skeleton className="mt-2 h-3 w-16" />
      </div>
    </div>
  );
}

/** Placeholder shown while the donor dashboard loads its sections. */
export function DashboardSkeleton() {
  return (
    <div data-testid="dashboard-skeleton" aria-hidden="true" className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="mt-2 h-4 w-64" />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="rounded-xl border border-border bg-card p-5 shadow-sm"
          >
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-3 h-8 w-20" />
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <Skeleton className="h-6 w-32" />
        <div className="mt-4">
          <ListSkeleton rows={2} />
        </div>
      </div>
    </div>
  );
}
