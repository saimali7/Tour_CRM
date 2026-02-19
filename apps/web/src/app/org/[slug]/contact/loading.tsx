import { SkeletonCard, SkeletonText } from "@/components/layout/skeleton";

export default function ContactLoading() {
  return (
    <div className="container px-4 py-8">
      <SkeletonText className="mb-6 h-4 w-36" />

      <div className="mx-auto max-w-6xl space-y-8">
        <div className="text-center">
          <SkeletonText className="mx-auto mb-2 h-10 w-48" />
          <SkeletonText className="mx-auto h-6 w-80" />
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} className="border" footer={<SkeletonText className="w-2/3" />} />
            ))}
          </div>

          <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6">
            <SkeletonText className="mb-6 h-8 w-52" />
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <SkeletonText className="h-11" />
                <SkeletonText className="h-11" />
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <SkeletonText className="h-11" />
                <SkeletonText className="h-11" />
              </div>
              <SkeletonText className="h-32" />
              <div className="flex justify-end">
                <SkeletonText className="h-10 w-36" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
