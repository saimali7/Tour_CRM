import { TableSkeleton } from "@/components/ui/skeleton";

export default function SchedulesLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-28 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-44 bg-gray-200 rounded animate-pulse mt-2" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-24 bg-gray-200 rounded animate-pulse" />
          <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
      <TableSkeleton rows={10} columns={8} />
    </div>
  );
}
