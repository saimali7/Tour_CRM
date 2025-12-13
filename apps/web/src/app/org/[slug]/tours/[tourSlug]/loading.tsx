export default function TourDetailLoading() {
  return (
    <div className="container px-4 py-8">
      {/* Breadcrumb Skeleton */}
      <div className="h-4 w-48 bg-muted animate-pulse rounded mb-6" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Image Gallery Skeleton */}
          <div className="space-y-4">
            <div className="aspect-[16/9] bg-muted animate-pulse rounded-lg" />
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="aspect-[4/3] bg-muted animate-pulse rounded-md" />
              ))}
            </div>
          </div>

          {/* Tour Info Skeleton */}
          <div>
            <div className="h-6 w-24 bg-muted animate-pulse rounded-full mb-3" />
            <div className="h-10 w-3/4 bg-muted animate-pulse rounded mb-4" />
            <div className="flex flex-wrap gap-4 mb-6">
              <div className="h-6 w-32 bg-muted animate-pulse rounded" />
              <div className="h-6 w-32 bg-muted animate-pulse rounded" />
              <div className="h-6 w-40 bg-muted animate-pulse rounded" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-full bg-muted animate-pulse rounded" />
              <div className="h-4 w-full bg-muted animate-pulse rounded" />
              <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
            </div>
          </div>

          {/* Includes/Excludes Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-lg border bg-card">
              <div className="h-6 w-40 bg-muted animate-pulse rounded mb-4" />
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="h-4 w-4 bg-muted animate-pulse rounded" />
                    <div className="h-4 w-full bg-muted animate-pulse rounded" />
                  </div>
                ))}
              </div>
            </div>
            <div className="p-6 rounded-lg border bg-card">
              <div className="h-6 w-44 bg-muted animate-pulse rounded mb-4" />
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="h-4 w-4 bg-muted animate-pulse rounded" />
                    <div className="h-4 w-full bg-muted animate-pulse rounded" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Meeting Point Skeleton */}
          <div className="p-6 rounded-lg border bg-card">
            <div className="h-6 w-36 bg-muted animate-pulse rounded mb-4" />
            <div className="h-5 w-48 bg-muted animate-pulse rounded mb-2" />
            <div className="h-4 w-full bg-muted animate-pulse rounded" />
          </div>
        </div>

        {/* Sidebar Skeleton */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-6">
            {/* Price Card Skeleton */}
            <div className="p-6 rounded-lg border bg-card shadow-sm">
              <div className="mb-4">
                <div className="h-4 w-12 bg-muted animate-pulse rounded mb-2" />
                <div className="h-9 w-24 bg-muted animate-pulse rounded mb-1" />
                <div className="h-4 w-20 bg-muted animate-pulse rounded" />
              </div>
              <div className="space-y-2 mb-6 pt-4 border-t">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex justify-between">
                    <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                    <div className="h-4 w-16 bg-muted animate-pulse rounded" />
                  </div>
                ))}
              </div>
              <div className="space-y-2 pt-4 border-t">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="h-4 w-4 bg-muted animate-pulse rounded" />
                    <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                  </div>
                ))}
              </div>
            </div>

            {/* Calendar Skeleton */}
            <div className="p-6 rounded-lg border bg-card shadow-sm">
              <div className="h-6 w-40 bg-muted animate-pulse rounded mb-4" />
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="h-8 w-8 bg-muted animate-pulse rounded" />
                  <div className="h-5 w-32 bg-muted animate-pulse rounded" />
                  <div className="h-8 w-8 bg-muted animate-pulse rounded" />
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <div key={i} className="h-4 w-full bg-muted animate-pulse rounded" />
                  ))}
                  {Array.from({ length: 35 }).map((_, i) => (
                    <div key={i} className="aspect-square bg-muted animate-pulse rounded" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
