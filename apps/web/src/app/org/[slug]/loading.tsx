import { SkeletonBlock, SkeletonCard, SkeletonText } from "@/components/layout/skeleton";

export default function Loading() {
  return (
    <div className="animate-pulse pb-20 pt-0">
      {/* Hero shimmer */}
      <SkeletonBlock className="min-h-[480px] sm:min-h-[540px]" />

      {/* Trust bar shimmer */}
      <div className="mx-auto max-w-[1560px] px-4 relative z-20 -mt-10 sm:-mt-14">
        <SkeletonBlock className="h-24 rounded-2xl" />
      </div>

      {/* Category grid shimmer */}
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-8 space-y-2">
          <SkeletonBlock className="h-8 w-80 rounded-lg" />
          <SkeletonBlock className="h-4 w-64 rounded" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBlock key={i} className="min-h-[220px] rounded-2xl" />
          ))}
        </div>
      </div>

      {/* Featured tours shimmer */}
      <div className="border-y border-border py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SkeletonText className="mb-6 w-48" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
