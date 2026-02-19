import { SkeletonCard, SkeletonText } from "@/components/layout/skeleton";

export default function Loading() {
  return (
    <div className="container px-4 py-8">
      <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <SkeletonText className="mb-2 h-9 w-48" />
          <SkeletonText className="h-5 w-64" />
        </div>
        <div className="flex items-center gap-3">
          <SkeletonText className="h-10 w-[180px]" />
          <SkeletonText className="h-10 w-[180px]" />
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonText key={i} className="h-8 w-24 rounded-full" />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}
