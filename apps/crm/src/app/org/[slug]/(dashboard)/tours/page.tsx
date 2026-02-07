"use client";

import { trpc } from "@/lib/trpc";
import { Plus, AlertTriangle, MapPin, Tag } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Design system components
import { TablePagination } from "@/components/ui/data-table";
import { useConfirmModal } from "@/components/ui/confirm-modal";
import { Button } from "@/components/ui/button";
import { ProductCard, type UnifiedProduct } from "@/components/products/product-card";
import { NoToursEmpty } from "@/components/ui/empty-state";

type StatusFilter = "all" | "draft" | "active" | "archived";

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "draft", label: "Draft" },
  { value: "archived", label: "Archived" },
];

export default function ToursPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const { confirm, ConfirmModal } = useConfirmModal();
  const utils = trpc.useUtils();

  // Fetch tours only
  const { data, isLoading, error } = trpc.product.listWithExtensions.useQuery({
    pagination: { page, limit: 20 },
    filters: {
      type: "tour",
      ...(statusFilter !== "all" ? { status: statusFilter } : {}),
    },
  });

  const { data: stats } = trpc.product.getStats.useQuery();

  // Product mutations
  const archiveMutation = trpc.product.archive.useMutation({
    onSuccess: () => {
      utils.product.listWithExtensions.invalidate();
      utils.product.getStats.invalidate();
      toast.success("Tour archived");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to archive tour");
    },
  });

  const deleteMutation = trpc.product.delete.useMutation({
    onSuccess: () => {
      utils.product.listWithExtensions.invalidate();
      utils.product.getStats.invalidate();
      toast.success("Tour deleted");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete tour");
    },
  });

  // Tour-specific mutations
  const publishTourMutation = trpc.tour.publish.useMutation({
    onSuccess: () => {
      utils.product.listWithExtensions.invalidate();
      utils.product.getStats.invalidate();
      toast.success("Tour published");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to publish tour");
    },
  });

  const duplicateTourMutation = trpc.tour.duplicate.useMutation({
    onSuccess: (newTour) => {
      utils.product.listWithExtensions.invalidate();
      utils.product.getStats.invalidate();
      toast.success("Tour duplicated");
      router.push(`/org/${slug}/tours/${newTour.id}`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to duplicate tour");
    },
  });

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: "Delete Tour",
      description: "This will permanently delete this tour. This action cannot be undone.",
      confirmLabel: "Delete",
      variant: "destructive",
    });

    if (confirmed) {
      deleteMutation.mutate({ id });
    }
  };

  const handleArchive = (id: string) => {
    archiveMutation.mutate({ id });
  };

  const handlePublish = (id: string) => {
    publishTourMutation.mutate({ id });
  };

  const handleDuplicate = (id: string, name: string) => {
    duplicateTourMutation.mutate({ id, newName: `${name} (Copy)` });
  };

  const handleStatusFilterChange = (value: StatusFilter) => {
    setStatusFilter(value);
    setPage(1);
  };

  // Transform product data to UnifiedProduct format for ProductCard
  const transformToUnifiedProduct = (product: NonNullable<typeof data>["data"][number]): UnifiedProduct => {
    return {
      id: product.id,
      type: "tour",
      name: product.name,
      slug: product.slug,
      status: product.status as "draft" | "active" | "archived",
      basePrice: product.basePrice,
      tour: product.tour ? {
        id: product.tour.id,
        durationMinutes: product.tour.durationMinutes,
        maxParticipants: product.tour.maxParticipants,
        scheduleStats: product.tour.scheduleStats ? {
          upcomingCount: product.tour.scheduleStats.upcomingCount,
          utilizationPercent: product.tour.scheduleStats.utilizationPercent,
          nextScheduleDate: product.tour.scheduleStats.nextScheduleDate,
        } : undefined,
      } : undefined,
    };
  };

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-destructive">Failed to load tours</p>
            <p className="text-xs text-destructive/70 mt-0.5">{error.message}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 rounded-md transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <header className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <h1 className="text-lg font-semibold text-foreground">Tours</h1>
            {/* Inline Stats */}
            {stats && (
              <div className="hidden sm:flex items-center gap-5 text-sm text-muted-foreground">
                <span><span className="font-medium text-foreground">{stats.byStatus.active}</span> active</span>
                <span><span className="font-medium text-warning">{stats.byStatus.draft}</span> draft</span>
                <span><span className="font-medium text-foreground">{stats.total}</span> total</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Pricing link */}
            <Button variant="outline" asChild>
              <Link href={`/org/${slug}/promo-codes` as Route}>
                <Tag className="h-4 w-4 mr-2" />
                Pricing
              </Link>
            </Button>

            {/* Add Tour Button */}
            <Button asChild>
              <Link href={`/org/${slug}/tours/new` as Route}>
                <Plus className="h-4 w-4 mr-2" />
                Add Tour
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Status Filter Bar */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 rounded-lg border border-input bg-background p-1">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleStatusFilterChange(opt.value)}
              className={cn(
                "px-3 py-1 text-sm rounded-md transition-colors",
                statusFilter === opt.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tour Cards Grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" data-testid="tours-grid">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-lg border border-border bg-card p-4 animate-pulse">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-5 w-12 bg-muted rounded" />
                <div className="h-5 w-16 bg-muted rounded" />
              </div>
              <div className="h-5 w-32 bg-muted rounded mb-2" />
              <div className="h-4 w-24 bg-muted rounded mb-4" />
              <div className="flex gap-4">
                <div className="h-4 w-16 bg-muted rounded" />
                <div className="h-4 w-16 bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : data?.data.length === 0 ? (
        <NoToursEmpty orgSlug={slug} />
      ) : (
        <>
          {/* Tour Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" data-testid="tours-grid">
            {data?.data.map((product) => (
              <ProductCard
                key={product.id}
                product={transformToUnifiedProduct(product)}
                orgSlug={slug}
                onPublish={product.tour ? () => handlePublish(product.tour!.id) : undefined}
                onArchive={() => handleArchive(product.id)}
                onDuplicate={product.tour ? () => handleDuplicate(product.tour!.id, product.name) : undefined}
                onDelete={() => handleDelete(product.id)}
              />
            ))}
          </div>

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <TablePagination
              page={page}
              totalPages={data.totalPages}
              total={data.total}
              pageSize={20}
              onPageChange={setPage}
            />
          )}
        </>
      )}

      {ConfirmModal}
    </div>
  );
}
