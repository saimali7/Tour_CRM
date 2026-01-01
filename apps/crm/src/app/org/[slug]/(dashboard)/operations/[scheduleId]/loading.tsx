export default function TourAssignmentLoading() {
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header Skeleton */}
      <div className="flex-shrink-0 border-b border-border bg-background">
        <div className="px-4 sm:px-6 py-3 space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-4 w-20 skeleton rounded" />
            <div className="h-4 w-px bg-border" />
            <div className="h-5 w-40 skeleton rounded" />
            <div className="h-4 w-16 skeleton rounded" />
            <div className="h-5 w-20 skeleton rounded-md" />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-4 w-24 skeleton rounded" />
              <div className="h-5 w-16 skeleton rounded" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-9 w-28 skeleton rounded-md" />
              <div className="h-9 w-24 skeleton rounded-md" />
            </div>
          </div>
        </div>
      </div>

      {/* Content Skeleton - Three Panel Layout */}
      <div className="flex-1 overflow-hidden hidden lg:flex">
        {/* Left Panel */}
        <div className="w-80 flex-shrink-0 border-r border-border bg-card p-4 space-y-4">
          <div className="space-y-2">
            <div className="h-4 w-24 skeleton rounded" />
            <div className="h-3 w-32 skeleton rounded" />
          </div>
          <div className="h-9 skeleton rounded-md" />
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-6 w-16 skeleton rounded-full" />
            ))}
          </div>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-20 skeleton rounded-lg" />
            ))}
          </div>
        </div>

        {/* Center Panel */}
        <div className="flex-1 min-w-0 bg-background p-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="h-4 w-28 skeleton rounded" />
                <div className="h-3 w-40 skeleton rounded" />
              </div>
              <div className="flex gap-1">
                <div className="h-8 w-8 skeleton rounded" />
                <div className="h-8 w-8 skeleton rounded" />
              </div>
            </div>
            <div className="h-6 skeleton rounded" />
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex gap-2">
                  <div className="h-16 w-48 skeleton rounded" />
                  <div className="h-16 flex-1 skeleton rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="w-72 flex-shrink-0 border-l border-border bg-card p-4 space-y-4">
          <div className="space-y-1">
            <div className="h-4 w-28 skeleton rounded" />
            <div className="h-3 w-36 skeleton rounded" />
          </div>
          <div className="h-48 skeleton rounded" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <div className="h-6 w-6 skeleton rounded-full" />
                <div className="flex-1 space-y-1">
                  <div className="h-4 w-24 skeleton rounded" />
                  <div className="h-3 w-32 skeleton rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile Skeleton */}
      <div className="flex-1 overflow-hidden lg:hidden">
        <div className="h-12 border-b border-border flex items-center gap-4 px-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 w-24 skeleton rounded" />
          ))}
        </div>
        <div className="p-4 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-20 skeleton rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
