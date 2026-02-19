import { SkeletonCard, SkeletonText } from "@/components/layout/skeleton";

export default function AboutLoading() {
  return (
    <div className="container px-4 py-8">
      <SkeletonText className="mb-6 h-4 w-32" />

      <div className="mx-auto max-w-5xl space-y-8">
        <div className="text-center">
          <div className="mx-auto mb-6 h-24 w-24 rounded-full skeleton" />
          <SkeletonText className="mx-auto mb-2 h-10 w-64" />
          <SkeletonText className="mx-auto h-6 w-80" />
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4 text-center">
              <SkeletonText className="mx-auto mb-2 h-8 w-20" />
              <SkeletonText className="mx-auto h-4 w-24" />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
