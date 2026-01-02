import { Skeleton } from "@/components/ui/skeleton";

function TimelineRowSkeleton() {
  return (
    <div className="flex items-center gap-4 py-3 border-b border-border last:border-0">
      {/* Guide info */}
      <div className="w-32 shrink-0 space-y-2">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
      {/* Timeline segments */}
      <div className="flex-1 flex items-center gap-1">
        <Skeleton className="h-10 w-16 rounded-md" />
        <Skeleton className="h-10 w-24 rounded-md" />
        <Skeleton className="h-10 w-32 rounded-md" />
        <Skeleton className="h-10 w-48 rounded-md" />
        <Skeleton className="h-10 w-20 rounded-md" />
      </div>
    </div>
  );
}

export default function CommandCenterLoading() {
  return (
    <div className="space-y-4">
      {/* Header Skeleton */}
      <header className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
      </header>

      {/* Command Center Content Skeleton */}
      <div className="space-y-4">
        {/* Date Navigation */}
        <div className="flex items-center justify-center gap-4">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>

        {/* Status Banner Skeleton */}
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Skeleton className="h-6 w-32" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-1" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-1" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-1" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-20 rounded-md" />
              <Skeleton className="h-9 w-24 rounded-md" />
              <Skeleton className="h-9 w-24 rounded-md" />
            </div>
          </div>
        </div>

        {/* Timeline Header Skeleton */}
        <div className="flex items-center gap-4 px-4 py-2 bg-muted/50 rounded-t-lg">
          <div className="w-32 shrink-0">
            <Skeleton className="h-4 w-12" />
          </div>
          <div className="flex-1 flex items-center gap-8">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-4 w-10" />
            ))}
          </div>
        </div>

        {/* Timeline Rows Skeleton */}
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="px-4">
            {[...Array(5)].map((_, i) => (
              <TimelineRowSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
