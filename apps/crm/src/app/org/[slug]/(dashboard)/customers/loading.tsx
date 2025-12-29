import { Skeleton, TableSkeleton } from "@/components/ui/skeleton";

export default function CustomersLoading() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>

      {/* Search and Filters */}
      <div className="flex flex-wrap gap-3">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-28" />
      </div>

      {/* Customer Table */}
      <TableSkeleton rows={10} columns={6} />

      {/* Pagination */}
      <div className="flex justify-between items-center">
        <Skeleton className="h-4 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-9 w-9" />
        </div>
      </div>
    </div>
  );
}
