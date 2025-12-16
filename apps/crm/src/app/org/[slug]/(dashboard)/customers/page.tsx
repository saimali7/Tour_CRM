"use client";

import { trpc } from "@/lib/trpc";
import {
  Users,
  Eye,
  Edit,
  Trash2,
  Mail,
  Phone,
  Calendar,
  UserPlus,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Customer360Sheet } from "@/components/customers/customer-360-sheet";

// Design system components
import { PageHeader, PageHeaderAction, StatsRow, StatCard } from "@/components/ui/page-header";
import { FilterBar, FilterSearch, FilterChipGroup } from "@/components/ui/filter-bar";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TablePagination,
  TableActions,
  ActionButton,
} from "@/components/ui/data-table";
import { TableSkeleton } from "@/components/ui/skeleton";
import { NoCustomersEmpty, NoResultsEmpty } from "@/components/ui/empty-state";
import { useConfirmModal } from "@/components/ui/confirm-modal";

type SourceFilter = "all" | "manual" | "website" | "api" | "import" | "referral";

const SOURCE_OPTIONS: { value: SourceFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "manual", label: "Manual" },
  { value: "website", label: "Website" },
  { value: "api", label: "API" },
  { value: "import", label: "Import" },
  { value: "referral", label: "Referral" },
];

export default function CustomersPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const { confirm, ConfirmModal } = useConfirmModal();

  const { data, isLoading, error } = trpc.customer.list.useQuery({
    pagination: { page, limit: 20 },
    filters: {
      search: search || undefined,
      source: sourceFilter === "all" ? undefined : sourceFilter,
    },
    sort: { field: "createdAt", direction: "desc" },
  });

  const { data: stats } = trpc.customer.getStats.useQuery();

  const utils = trpc.useUtils();

  const deleteMutation = trpc.customer.delete.useMutation({
    onSuccess: () => {
      utils.customer.list.invalidate();
      utils.customer.getStats.invalidate();
      toast.success("Customer deleted successfully");
    },
    onError: (error) => {
      toast.error(`Failed to delete customer: ${error.message}`);
    },
  });

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: "Delete Customer",
      description: "This will permanently delete this customer and all their associated data including bookings and notes. This action cannot be undone.",
      confirmLabel: "Delete Customer",
      variant: "destructive",
    });

    if (confirmed) {
      deleteMutation.mutate({ id });
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(date));
  };

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6">
        <p className="text-destructive">Error loading customers: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Customers"
        description="Manage your customer database"
      >
        <PageHeaderAction href={`/org/${slug}/customers/new`}>
          Add Customer
        </PageHeaderAction>
      </PageHeader>

      {/* Stats Row */}
      {stats && (
        <StatsRow>
          <StatCard
            icon={Users}
            label="Total"
            value={stats.total}
            iconColor="text-primary"
            iconBgColor="bg-primary/10"
          />
          <StatCard
            icon={UserPlus}
            label="This Month"
            value={stats.thisMonth}
            iconColor="text-success"
            iconBgColor="bg-success/10"
          />
          <StatCard
            icon={Calendar}
            label="Website"
            value={stats.bySource.website ?? 0}
            iconColor="text-primary"
            iconBgColor="bg-primary/10"
          />
          <StatCard
            icon={Users}
            label="Manual"
            value={stats.bySource.manual ?? 0}
            iconColor="text-warning"
            iconBgColor="bg-warning/10"
          />
        </StatsRow>
      )}

      {/* Filters */}
      <FilterBar>
        <FilterSearch
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="Search by name, email, or phone..."
        />
        <FilterChipGroup
          value={sourceFilter}
          onChange={(value) => {
            setSourceFilter(value);
            setPage(1);
          }}
          options={SOURCE_OPTIONS}
        />
      </FilterBar>

      {/* Table */}
      {isLoading ? (
        <TableSkeleton rows={10} columns={6} />
      ) : data?.data.length === 0 ? (
        <div className="rounded-lg border border-border bg-card">
          {search ? (
            <NoResultsEmpty searchTerm={search} />
          ) : (
            <NoCustomersEmpty orgSlug={slug} />
          )}
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.data.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-primary font-medium">
                          {customer.firstName?.[0] ?? ''}
                          {customer.lastName?.[0] ?? ''}
                        </span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-foreground">
                          {customer.firstName} {customer.lastName}
                        </div>
                        {customer.tags && customer.tags.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {customer.tags.slice(0, 2).map((tag) => (
                              <span
                                key={tag}
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-secondary text-secondary-foreground"
                              >
                                {tag}
                              </span>
                            ))}
                            {customer.tags.length > 2 && (
                              <span className="text-xs text-muted-foreground">
                                +{customer.tags.length - 2}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {customer.email && (
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Mail className="h-3.5 w-3.5" />
                          <a
                            href={`mailto:${customer.email}`}
                            className="hover:text-primary transition-colors"
                          >
                            {customer.email}
                          </a>
                        </div>
                      )}
                      {customer.phone && (
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Phone className="h-3.5 w-3.5" />
                          <a
                            href={`tel:${customer.phone}`}
                            className="hover:text-primary transition-colors"
                          >
                            {customer.phone}
                          </a>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                      {customer.source ? customer.source.charAt(0).toUpperCase() + customer.source.slice(1) : "Unknown"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {customer.city || customer.country
                        ? [customer.city, customer.country].filter(Boolean).join(", ")
                        : "-"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(customer.createdAt)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <TableActions>
                      <ActionButton
                        tooltip="360 View"
                        onClick={() => setSelectedCustomerId(customer.id)}
                      >
                        <Sparkles className="h-4 w-4" />
                      </ActionButton>
                      <Link href={`/org/${slug}/customers/${customer.id}` as Route}>
                        <ActionButton tooltip="View customer">
                          <Eye className="h-4 w-4" />
                        </ActionButton>
                      </Link>
                      <Link href={`/org/${slug}/customers/${customer.id}/edit` as Route}>
                        <ActionButton tooltip="Edit customer">
                          <Edit className="h-4 w-4" />
                        </ActionButton>
                      </Link>
                      <ActionButton
                        variant="danger"
                        tooltip="Delete customer"
                        onClick={() => handleDelete(customer.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </ActionButton>
                    </TableActions>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

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

      {/* Customer 360 Sheet */}
      {selectedCustomerId && (
        <Customer360Sheet
          customerId={selectedCustomerId}
          orgSlug={slug}
          open={!!selectedCustomerId}
          onOpenChange={(open) => !open && setSelectedCustomerId(null)}
        />
      )}
    </div>
  );
}
