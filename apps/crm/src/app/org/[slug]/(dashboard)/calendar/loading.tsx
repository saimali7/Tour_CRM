import { Skeleton } from "@/components/ui/skeleton";

export default function CalendarLoading() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Skeleton className="h-8 w-28 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-10" />
        </div>
      </div>

      {/* Calendar Header */}
      <div className="flex justify-between items-center">
        <Skeleton className="h-6 w-40" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-20" />
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Day Headers */}
        <div className="grid grid-cols-7 border-b border-border">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="p-3 text-center border-r border-border last:border-r-0">
              <Skeleton className="h-4 w-8 mx-auto" />
            </div>
          ))}
        </div>
        {/* Calendar Cells */}
        {Array.from({ length: 5 }).map((_, week) => (
          <div key={week} className="grid grid-cols-7 border-b border-border last:border-b-0">
            {Array.from({ length: 7 }).map((_, day) => (
              <div key={day} className="h-28 p-2 border-r border-border last:border-r-0">
                <Skeleton className="h-5 w-5 mb-2" />
                <div className="space-y-1">
                  <Skeleton className="h-5 w-full rounded" />
                  <Skeleton className="h-5 w-3/4 rounded" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
