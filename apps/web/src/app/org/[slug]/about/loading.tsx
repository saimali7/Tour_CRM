export default function AboutLoading() {
  return (
    <div className="container px-4 py-8">
      {/* Breadcrumb Skeleton */}
      <div className="h-4 w-32 bg-muted animate-pulse rounded mb-6" />

      <div className="max-w-4xl mx-auto">
        {/* Hero Section Skeleton */}
        <div className="text-center mb-12">
          <div className="w-32 h-32 mx-auto mb-6 bg-muted animate-pulse rounded-full" />
          <div className="h-10 w-64 bg-muted animate-pulse rounded mx-auto mb-4" />
          <div className="h-6 w-80 bg-muted animate-pulse rounded mx-auto" />
        </div>

        {/* About Content Skeleton */}
        <div className="p-8 rounded-lg border bg-card mb-12">
          <div className="h-7 w-32 bg-muted animate-pulse rounded mb-4" />
          <div className="space-y-3">
            <div className="h-4 w-full bg-muted animate-pulse rounded" />
            <div className="h-4 w-full bg-muted animate-pulse rounded" />
            <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
            <div className="h-4 w-full bg-muted animate-pulse rounded mt-4" />
            <div className="h-4 w-full bg-muted animate-pulse rounded" />
            <div className="h-4 w-2/3 bg-muted animate-pulse rounded" />
          </div>
        </div>

        {/* Values Section Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-6 rounded-lg border bg-card text-center">
              <div className="w-12 h-12 rounded-full mx-auto mb-4 bg-muted animate-pulse" />
              <div className="h-5 w-32 bg-muted animate-pulse rounded mx-auto mb-2" />
              <div className="h-4 w-full bg-muted animate-pulse rounded mb-1" />
              <div className="h-4 w-3/4 bg-muted animate-pulse rounded mx-auto" />
            </div>
          ))}
        </div>

        {/* Contact Info Skeleton */}
        <div className="p-8 rounded-lg border bg-card">
          <div className="h-7 w-32 bg-muted animate-pulse rounded mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="h-5 w-5 bg-muted animate-pulse rounded" />
                <div>
                  <div className="h-5 w-16 bg-muted animate-pulse rounded mb-1" />
                  <div className="h-4 w-40 bg-muted animate-pulse rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
