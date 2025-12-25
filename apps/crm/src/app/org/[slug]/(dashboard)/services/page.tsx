"use client";

import { trpc } from "@/lib/trpc";
import { Edit, Trash2, Archive, MoreHorizontal, Plus, AlertTriangle, Loader2, Package, Tag, CalendarClock, Briefcase, DollarSign } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { useParams } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

// Design system components
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { TourStatusBadge } from "@/components/ui/status-badge";
import { TablePagination } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { useConfirmModal } from "@/components/ui/confirm-modal";

type ServiceTypeFilter = "all" | "transfer" | "addon" | "rental" | "package" | "custom";
type StatusFilter = "all" | "draft" | "active" | "archived";

const SERVICE_TYPE_OPTIONS: { value: ServiceTypeFilter; label: string }[] = [
  { value: "all", label: "All Types" },
  { value: "transfer", label: "Transfer" },
  { value: "addon", label: "Add-on" },
  { value: "rental", label: "Rental" },
  { value: "package", label: "Package" },
  { value: "custom", label: "Custom" },
];

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "draft", label: "Draft" },
  { value: "archived", label: "Archived" },
];

const SERVICE_TYPE_BADGES: Record<string, { label: string; className: string }> = {
  transfer: { label: "Transfer", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  addon: { label: "Add-on", className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" },
  rental: { label: "Rental", className: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300" },
  package: { label: "Package", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
  custom: { label: "Custom", className: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300" },
};

const PRICING_MODEL_LABELS: Record<string, string> = {
  flat: "Flat Rate",
  per_person: "Per Person",
  per_hour: "Per Hour",
  per_day: "Per Day",
  per_vehicle: "Per Vehicle",
  custom: "Custom",
};

export default function ServicesPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [page, setPage] = useState(1);
  const [serviceTypeFilter, setServiceTypeFilter] = useState<ServiceTypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const { confirm, ConfirmModal } = useConfirmModal();

  // Build filters object
  const filters = {
    ...(statusFilter !== "all" && { status: statusFilter as "draft" | "active" | "archived" }),
    ...(serviceTypeFilter !== "all" && { serviceType: serviceTypeFilter as "transfer" | "addon" | "rental" | "package" | "custom" }),
  };

  // Fetch services
  const { data, isLoading, error } = trpc.catalogService.list.useQuery({
    pagination: { page, limit: 20 },
    filters: Object.keys(filters).length > 0 ? filters : undefined,
  });

  // Mutations
  const utils = trpc.useUtils();

  const archiveMutation = trpc.catalogService.archive.useMutation({
    onSuccess: () => {
      utils.catalogService.list.invalidate();
    },
  });

  const deleteMutation = trpc.catalogService.delete.useMutation({
    onSuccess: () => {
      utils.catalogService.list.invalidate();
    },
  });

  const handleArchive = (id: string) => {
    archiveMutation.mutate({ id });
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: "Delete Service",
      description: "This will permanently delete this service. This action cannot be undone.",
      confirmLabel: "Delete Service",
      variant: "destructive",
    });

    if (confirmed) {
      deleteMutation.mutate({ id });
    }
  };

  const handleServiceTypeFilterChange = (value: ServiceTypeFilter) => {
    setServiceTypeFilter(value);
    setPage(1);
  };

  const handleStatusFilterChange = (value: StatusFilter) => {
    setStatusFilter(value);
    setPage(1);
  };

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-destructive">Failed to load services</p>
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
      {/* Header: Catalog Title + Tabs + Add Service */}
      <header className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <h1 className="text-lg font-semibold text-foreground">Catalog</h1>
            {/* Inline Stats */}
            {data && (
              <div className="hidden sm:flex items-center gap-5 text-sm text-muted-foreground">
                <span><span className="font-medium text-foreground">{data.data.filter(s => s.product.status === "active").length}</span> active</span>
                <span><span className="font-medium text-amber-600">{data.data.filter(s => s.product.status === "draft").length}</span> draft</span>
                <span><span className="font-medium text-foreground">{data.total}</span> total</span>
              </div>
            )}
          </div>

          <Button asChild>
            <Link
              href={`/org/${slug}/services/new` as Route}
              className="inline-flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Add Service
            </Link>
          </Button>
        </div>

        {/* Catalog Tabs */}
        <nav className="flex items-center gap-1 border-b border-border -mb-px">
          <Link
            href={`/org/${slug}/tours` as Route}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 border-transparent text-muted-foreground hover:text-foreground hover:border-border transition-colors -mb-px"
          >
            <Package className="h-4 w-4" />
            Tours
          </Link>
          <button className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 border-primary text-foreground -mb-px">
            <Briefcase className="h-4 w-4" />
            Services
          </button>
          <Link
            href={`/org/${slug}/promo-codes` as Route}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 border-transparent text-muted-foreground hover:text-foreground hover:border-border transition-colors -mb-px"
          >
            <Tag className="h-4 w-4" />
            Pricing
          </Link>
          <Link
            href={`/org/${slug}/availability` as Route}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 border-transparent text-muted-foreground hover:text-foreground hover:border-border transition-colors -mb-px"
          >
            <CalendarClock className="h-4 w-4" />
            Schedules
          </Link>
        </nav>
      </header>

      {/* Compact Filter Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Status Filter Chips */}
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

        {/* Service Type Filter Chips */}
        <div className="flex items-center gap-1 rounded-lg border border-input bg-background p-1">
          {SERVICE_TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleServiceTypeFilterChange(opt.value)}
              className={cn(
                "px-3 py-1 text-sm rounded-md transition-colors whitespace-nowrap",
                serviceTypeFilter === opt.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Service Cards Grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-lg border border-border bg-card p-4 animate-pulse">
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
        <div className="rounded-lg border border-border bg-card">
          <EmptyState
            icon={Briefcase}
            title="Create your first service"
            description="Add services like transfers, rentals, add-ons, or packages to complement your tour offerings."
            action={{
              label: "Add Service",
              href: `/org/${slug}/services/new`,
              icon: Plus,
            }}
            showTip
            tipText="Services help you offer complete travel experiences"
          />
        </div>
      ) : (
        <>
          {/* Service Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {data?.data.map((service) => {
              const isOptimistic = (service as any)._optimistic;
              const serviceTypeBadge = SERVICE_TYPE_BADGES[service.serviceType] ?? { label: service.serviceType, className: "bg-gray-100 text-gray-700" };
              const pricingModelLabel = PRICING_MODEL_LABELS[service.pricingModel] ?? service.pricingModel;

              return (
                <div
                  key={service.id}
                  className={cn(
                    "group rounded-lg border bg-card hover:border-primary/50 hover:shadow-sm transition-all",
                    "border-border",
                    // Optimistic update styling
                    isOptimistic && "opacity-70 animate-pulse"
                  )}
                >
                  {/* Card Header */}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="min-w-0 flex-1">
                        {isOptimistic ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                            <span className="font-medium text-foreground line-clamp-1">
                              {service.product.name}
                            </span>
                          </div>
                        ) : (
                          <Link
                            href={`/org/${slug}/services/${service.id}` as Route}
                            className="font-medium text-foreground hover:text-primary transition-colors line-clamp-1"
                          >
                            {service.product.name}
                          </Link>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <span className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                            serviceTypeBadge.className
                          )}>
                            {serviceTypeBadge.label}
                          </span>
                        </div>
                      </div>
                      <TourStatusBadge status={service.product.status as "draft" | "active" | "archived"} />
                    </div>

                    {/* Service Details */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {pricingModelLabel} · ${parseFloat(service.product.basePrice).toFixed(2)}
                        </span>
                      </div>

                      {/* Service Flags */}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {service.isStandalone && (
                          <span className="px-2 py-0.5 rounded-md bg-muted">Standalone</span>
                        )}
                        {service.isAddon && (
                          <span className="px-2 py-0.5 rounded-md bg-muted">Add-on</span>
                        )}
                        {service.requiresApproval && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                            Requires Approval
                          </span>
                        )}
                      </div>

                      {/* Short Description */}
                      {service.product.shortDescription && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-2">
                          {service.product.shortDescription}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-border bg-muted/30">
                    <Link
                      href={`/org/${slug}/services/${service.id}` as Route}
                      className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors"
                    >
                      View Details
                    </Link>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem asChild>
                          <Link href={`/org/${slug}/services/${service.id}?tab=details` as Route}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Service
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {service.product.status === "active" && (
                          <DropdownMenuItem onClick={() => handleArchive(service.id)}>
                            <Archive className="h-4 w-4 mr-2" />
                            Archive
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => handleDelete(service.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
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
