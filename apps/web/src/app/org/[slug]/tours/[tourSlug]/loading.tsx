import { SkeletonCard, SkeletonImage, SkeletonText } from "@/components/layout/skeleton";

export default function TourDetailLoading() {
  return (
    <div className="container px-4 py-8">
      <SkeletonText className="mb-6 h-4 w-48" />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <div className="space-y-3">
            <SkeletonImage className="aspect-[16/9]" />
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonImage key={i} className="aspect-[4/3] rounded-md" />
              ))}
            </div>
          </div>

          <div>
            <SkeletonText className="mb-3 h-6 w-24 rounded-full" />
            <SkeletonText className="mb-4 h-10 w-3/4" />
            <div className="mb-6 flex flex-wrap gap-3">
              <SkeletonText className="h-6 w-36" />
              <SkeletonText className="h-6 w-36" />
              <SkeletonText className="h-6 w-40" />
            </div>
            <SkeletonText className="mb-2 h-4 w-full" />
            <SkeletonText className="mb-2 h-4 w-full" />
            <SkeletonText className="h-4 w-2/3" />
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <SkeletonCard />
            <SkeletonCard />
          </div>

          <SkeletonCard className="border" />
        </div>

        <div className="space-y-6 lg:col-span-1">
          <SkeletonCard className="border" />
          <SkeletonCard className="border" />
        </div>
      </div>
    </div>
  );
}
