import { SkeletonBlock, SkeletonText, SkeletonCard } from "@/components/layout";

export default function CategoryHubLoading() {
  return (
    <div className="animate-pulse pb-20 pt-0">
      {/* Breadcrumb */}
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
        <SkeletonText className="w-48" />
      </div>

      {/* Hero */}
      <SkeletonBlock className="min-h-[480px] sm:min-h-[540px]" />

      {/* Trust strip */}
      <div className="border-b border-border bg-accent/30 py-4">
        <div className="mx-auto flex max-w-7xl justify-center gap-8 px-4">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonText key={i} className="w-32" />
          ))}
        </div>
      </div>

      {/* Intro */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="max-w-3xl space-y-3">
          <SkeletonText />
          <SkeletonText className="w-5/6" />
          <SkeletonText className="w-4/6" />
        </div>
      </div>

      {/* Tour grid */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 space-y-2">
          <SkeletonBlock className="h-8 w-64 rounded-lg" />
          <SkeletonBlock className="h-4 w-96 rounded" />
        </div>
        <div className="grid grid-cols-1 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
