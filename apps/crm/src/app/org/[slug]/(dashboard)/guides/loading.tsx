import { TableSkeleton } from "@/components/ui/skeleton";

export default function GuidesLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-40 bg-gray-200 rounded animate-pulse mt-2" />
        </div>
        <div className="h-10 w-28 bg-gray-200 rounded animate-pulse" />
      </div>
      <TableSkeleton rows={10} columns={6} />
    </div>
  );
}
