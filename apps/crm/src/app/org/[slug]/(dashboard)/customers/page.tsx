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
    <div className="space-y-4">
      {/* Header: Title + Inline Stats + Add Customer */}
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <h1 className="text-lg font-semibold text-foreground">Customers</h1>
          {/* Inline Stats */}
          {stats && (
            <div className="hidden sm:flex items-center gap-5 text-sm text-muted-foreground">
              <span><span className="font-medium text-foreground">{stats.total}</span> total</span>
              <span><span className="font-medium text-emerald-600">+{stats.thisMonth}</span> this month</span>
            </div>
          )}
        </div>

        <Link
          href={`/org/${slug}/customers/new` as Route}
          className="inline-flex items-center gap-1.5 h-9 px-4 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <UserPlus className="h-4 w-4" />
          Add Customer
        </Link>
      </header>

      {/* Compact Filter Bar */}
      <div className="flex items-center gap-3" role="search" aria-label="Filter customers">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name, phone, or email..."
            aria-label="Search customers by name, phone, or email"
            className="w-full h-9 pl-3 pr-8 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <span className="sr-only">Clear</span>
              ×
            </button>
          )}
        </div>

        {/* Source Dropdown */}
        <select
          value={sourceFilter}
          onChange={(e) => {
            setSourceFilter(e.target.value as SourceFilter);
            setPage(1);
          }}
          aria-label="Filter by customer source"
          className="h-9 px-3 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        >
          {SOURCE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.value === "all" ? "All Sources" : opt.label}
            </option>
          ))}
        </select>
      </div>

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
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.data.map((customer) => (
                <TableRow key={customer.id}>
                  {/* Customer: First name prominent, last name secondary */}
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-primary font-medium text-sm">
                          {customer.firstName?.[0]?.toUpperCase() ?? '?'}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">
                          {customer.firstName}
                          {customer.lastName && (
                            <span className="font-normal text-muted-foreground ml-1">
                              {customer.lastName}
                            </span>
                          )}
                        </div>
                        {customer.tags && customer.tags.length > 0 && (
                          <div className="flex gap-1 mt-0.5">
                            {customer.tags.slice(0, 2).map((tag) => (
                              <span
                                key={tag}
                                className="inline-flex items-center px-1.5 py-0 rounded text-[10px] bg-muted text-muted-foreground"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  {/* Phone: Primary contact method for tour operations */}
                  <TableCell>
                    {customer.phone ? (
                      <a
                        href={`tel:${customer.phone}`}
                        className="inline-flex items-center gap-1.5 text-sm text-foreground hover:text-primary transition-colors font-mono"
                      >
                        <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                        {customer.phone}
                      </a>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  {/* Email: Secondary contact */}
                  <TableCell>
                    {customer.email ? (
                      <a
                        href={`mailto:${customer.email}`}
                        className="text-sm text-muted-foreground hover:text-primary transition-colors truncate block max-w-[200px]"
                      >
                        {customer.email}
                      </a>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">
                      {customer.source ? customer.source.charAt(0).toUpperCase() + customer.source.slice(1) : "—"}
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
