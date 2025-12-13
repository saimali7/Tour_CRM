export default function Loading() {
  return (
    <div className="container px-4 py-8">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-8">
        <div>
          <div className="h-9 w-48 bg-muted animate-pulse rounded mb-2" />
          <div className="h-5 w-64 bg-muted animate-pulse rounded" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-10 w-[180px] bg-muted animate-pulse rounded" />
          <div className="h-10 w-[180px] bg-muted animate-pulse rounded" />
        </div>
      </div>

      {/* Filter Pills Skeleton */}
      <div className="flex flex-wrap gap-2 mb-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-8 w-24 bg-muted animate-pulse rounded-full" />
        ))}
      </div>

      {/* Tour Cards Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card overflow-hidden">
            {/* Image Skeleton */}
            <div className="aspect-[4/3] bg-muted animate-pulse" />
            {/* Content Skeleton */}
            <div className="p-4 space-y-3">
              <div className="h-4 w-20 bg-muted animate-pulse rounded" />
              <div className="h-6 w-3/4 bg-muted animate-pulse rounded" />
              <div className="h-4 w-full bg-muted animate-pulse rounded" />
              <div className="h-4 w-2/3 bg-muted animate-pulse rounded" />
              <div className="flex justify-between items-center pt-2">
                <div className="h-4 w-16 bg-muted animate-pulse rounded" />
                <div className="h-6 w-20 bg-muted animate-pulse rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
