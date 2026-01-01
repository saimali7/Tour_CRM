import { cn } from "@/lib/utils";

export default function OperationsLoading() {
  return (
    <div className="min-h-screen">
      {/* Header Skeleton */}
      <div className="sticky top-0 z-30 bg-background border-b border-border">
        <div className="px-4 sm:px-6 py-4 space-y-4">
          {/* Title */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="h-5 w-40 skeleton rounded" />
              <div className="h-3 w-52 skeleton rounded" />
            </div>
          </div>

          {/* Date Nav Skeleton */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <div className="h-8 w-8 skeleton rounded-md" />
              <div className="h-8 w-8 skeleton rounded-md" />
            </div>
            <div className="h-8 w-48 skeleton rounded-lg" />
          </div>

          {/* Stats Skeleton */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border"
              >
                <div className="h-10 w-10 skeleton rounded-lg" />
                <div className="space-y-1">
                  <div className="h-6 w-10 skeleton rounded" />
                  <div className="h-3 w-14 skeleton rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="px-4 sm:px-6 py-6 space-y-6">
        {[1, 2].map((group) => (
          <div key={group}>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-4 w-24 skeleton rounded" />
              <div className="h-4 w-12 skeleton rounded" />
            </div>
            <div className="space-y-2">
              {[1, 2, 3].map((card) => (
                <div
                  key={card}
                  className="flex items-center gap-4 px-4 py-3 rounded-lg border border-border"
                >
                  <div className="h-5 w-16 skeleton rounded" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-4 w-32 skeleton rounded" />
                    <div className="h-3 w-48 skeleton rounded" />
                  </div>
                  <div className="hidden sm:flex items-center gap-4">
                    <div className="h-5 w-10 skeleton rounded" />
                    <div className="h-5 w-10 skeleton rounded" />
                  </div>
                  <div className="h-4 w-4 skeleton rounded" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
