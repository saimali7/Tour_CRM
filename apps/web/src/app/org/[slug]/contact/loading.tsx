export default function ContactLoading() {
  return (
    <div className="container px-4 py-8">
      {/* Breadcrumb Skeleton */}
      <div className="h-4 w-36 bg-muted animate-pulse rounded mb-6" />

      <div className="max-w-5xl mx-auto">
        {/* Header Skeleton */}
        <div className="text-center mb-12">
          <div className="h-10 w-48 bg-muted animate-pulse rounded mx-auto mb-4" />
          <div className="h-6 w-72 bg-muted animate-pulse rounded mx-auto" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact Information Skeleton */}
          <div className="lg:col-span-1 space-y-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-6 rounded-lg border bg-card">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-muted animate-pulse flex-shrink-0" />
                  <div className="flex-1">
                    <div className="h-5 w-24 bg-muted animate-pulse rounded mb-2" />
                    <div className="h-4 w-40 bg-muted animate-pulse rounded mb-1" />
                    <div className="h-3 w-48 bg-muted animate-pulse rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Contact Form Skeleton */}
          <div className="lg:col-span-2">
            <div className="p-8 rounded-lg border bg-card">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-6 w-6 bg-muted animate-pulse rounded" />
                <div className="h-7 w-48 bg-muted animate-pulse rounded" />
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="h-4 w-24 bg-muted animate-pulse rounded mb-2" />
                    <div className="h-10 w-full bg-muted animate-pulse rounded" />
                  </div>
                  <div>
                    <div className="h-4 w-32 bg-muted animate-pulse rounded mb-2" />
                    <div className="h-10 w-full bg-muted animate-pulse rounded" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="h-4 w-28 bg-muted animate-pulse rounded mb-2" />
                    <div className="h-10 w-full bg-muted animate-pulse rounded" />
                  </div>
                  <div>
                    <div className="h-4 w-20 bg-muted animate-pulse rounded mb-2" />
                    <div className="h-10 w-full bg-muted animate-pulse rounded" />
                  </div>
                </div>

                <div>
                  <div className="h-4 w-20 bg-muted animate-pulse rounded mb-2" />
                  <div className="h-32 w-full bg-muted animate-pulse rounded" />
                </div>

                <div className="flex justify-end">
                  <div className="h-10 w-36 bg-muted animate-pulse rounded" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ Skeleton */}
        <div className="mt-12 p-8 rounded-lg border bg-card">
          <div className="h-7 w-64 bg-muted animate-pulse rounded mx-auto mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i}>
                <div className="h-5 w-48 bg-muted animate-pulse rounded mb-2" />
                <div className="h-4 w-full bg-muted animate-pulse rounded mb-1" />
                <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
