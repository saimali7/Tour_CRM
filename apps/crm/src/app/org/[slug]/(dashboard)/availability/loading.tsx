import { Skeleton } from "@/components/ui/skeleton";

export default function AvailabilityLoading() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-3">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Calendar/List View */}
      <div className="rounded-xl border border-border bg-card p-6">
        {/* Week Header */}
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="h-6 w-40" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-9" />
            <Skeleton className="h-9 w-9" />
          </div>
        </div>

        {/* Day Columns */}
        <div className="grid grid-cols-7 gap-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="text-center">
                <Skeleton className="h-4 w-8 mx-auto mb-1" />
                <Skeleton className="h-8 w-8 mx-auto rounded-full" />
              </div>
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, j) => (
                  <Skeleton key={j} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
