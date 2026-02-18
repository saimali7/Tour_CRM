"use client";

import { trpc } from "@/lib/trpc";
import {
  Eye,
  Edit,
  Trash2,
  Mail,
  Phone,
  UserPlus,
  Focus,
  AlertTriangle,
  MoreHorizontal,
  Star,
  Clock,
  TrendingUp,
  UserX,
  Copy,
  ChevronRight,
  Tag,
  Download,
  Settings2,
  Check,
} from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { useParams, useRouter } from "next/navigation";
import { useState, useRef, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { Customer360Sheet } from "@/components/customers/customer-360-sheet";
import { AddCustomerSheet } from "@/components/customers/add-customer-sheet";
import { CustomerMobileCard, CustomerMobileCardSkeleton } from "@/components/customers/customer-mobile-card";
import { useIsMobile } from "@/hooks/use-media-query";
import { useHotkeys, useKeyboardNavigation } from "@/hooks/use-keyboard-navigation";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { formatLocalDateKey } from "@/lib/date-time";

// Design system components
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TablePagination,
  SelectAllCheckbox,
  SelectRowCheckbox,
  BulkActionBar,
  useTableSelection,
} from "@/components/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TableSkeleton } from "@/components/ui/skeleton";
import { NoCustomersEmpty, NoResultsEmpty } from "@/components/ui/empty-state";
import { useConfirmModal } from "@/components/ui/confirm-modal";
import { cn } from "@/lib/utils";

type SourceFilter = "all" | "manual" | "website" | "api" | "import" | "referral";
type SegmentFilter = "all" | "vip" | "at_risk" | "new" | "inactive";

const SOURCE_OPTIONS: { value: SourceFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "manual", label: "Manual" },
  { value: "website", label: "Website" },
  { value: "api", label: "API" },
  { value: "import", label: "Import" },
  { value: "referral", label: "Referral" },
];

const SEGMENT_FILTERS: { value: SegmentFilter; label: string; icon: typeof Star }[] = [
  { value: "vip", label: "VIP", icon: Star },
  { value: "at_risk", label: "At Risk", icon: AlertTriangle },
  { value: "new", label: "New This Month", icon: TrendingUp },
  { value: "inactive", label: "Inactive", icon: Clock },
];

// Column configuration for customization
type ColumnId = "customer" | "phone" | "email" | "source" | "created";
const COLUMN_CONFIG: { id: ColumnId; label: string; defaultVisible: boolean }[] = [
  { id: "customer", label: "Customer", defaultVisible: true },
  { id: "phone", label: "Phone", defaultVisible: true },
  { id: "email", label: "Email", defaultVisible: true },
  { id: "source", label: "Source", defaultVisible: true },
  { id: "created", label: "Created", defaultVisible: true },
];

const DEFAULT_VISIBLE_COLUMNS: ColumnId[] = COLUMN_CONFIG.filter(c => c.defaultVisible).map(c => c.id);

export default function CustomersPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const isMobile = useIsMobile();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [segmentFilter, setSegmentFilter] = useState<SegmentFilter>("all");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [visibleColumns, setVisibleColumns] = useLocalStorage<ColumnId[]>(
    "customers-visible-columns",
    DEFAULT_VISIBLE_COLUMNS
  );
  const { confirm, ConfirmModal } = useConfirmModal();

  const isColumnVisible = useCallback((columnId: ColumnId) => {
    return visibleColumns.includes(columnId);
  }, [visibleColumns]);

  const toggleColumn = useCallback((columnId: ColumnId) => {
    setVisibleColumns(prev => {
      if (prev.includes(columnId)) {
        // Don't allow hiding the customer column
        if (columnId === "customer") return prev;
        return prev.filter(c => c !== columnId);
      }
      return [...prev, columnId];
    });
  }, [setVisibleColumns]);

  const { data, isLoading, error } = trpc.customer.list.useQuery({
    pagination: { page, limit: 20 },
    filters: {
      search: search || undefined,
      source: sourceFilter === "all" ? undefined : sourceFilter,
      // Segment filters applied client-side for now (could be server-side)
      tags: segmentFilter === "vip" ? ["vip"] : undefined,
    },
    sort: { field: "createdAt", direction: "desc" },
  });

  const { data: stats } = trpc.customer.getStats.useQuery();

  const utils = trpc.useUtils();

  // Filtered data based on segment
  const filteredData = useMemo(() => {
    if (!data?.data) return [];

    let filtered = data.data;

    // Apply segment filters
    if (segmentFilter === "new") {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      filtered = filtered.filter(c => new Date(c.createdAt) >= monthAgo);
    }

    return filtered;
  }, [data?.data, segmentFilter]);

  // Bulk selection
  const {
    selectedCount,
    checkboxState,
    toggleAll,
    toggleItem,
    isSelected,
    clearSelection,
    getSelectedItems,
  } = useTableSelection({
    items: filteredData,
    getItemId: (item) => item.id,
  });

  // Keyboard navigation for table rows
  const {
    focusedIndex,
    getRowProps,
    containerProps,
  } = useKeyboardNavigation({
    items: filteredData,
    getItemId: (item) => item.id,
    onOpen: (item) => router.push(`/org/${slug}/customers/${item.id}` as Route),
    onEdit: (item) => router.push(`/org/${slug}/customers/${item.id}/edit` as Route),
    onDelete: (item) => handleDelete(item.id),
    enabled: !isMobile && !selectedCustomerId, // Disable when sheet is open
  });

  // Global keyboard shortcuts
  useHotkeys({
    "/": () => searchInputRef.current?.focus(),
    "n": () => setShowAddCustomer(true),
    "escape": () => {
      setSelectedCustomerId(null);
      setShowAddCustomer(false);
      searchInputRef.current?.blur();
    },
  }, { enabled: !selectedCustomerId && !showAddCustomer });

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

  // Copy to clipboard with toast feedback
  const handleCopy = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  }, []);

  // Navigate to customer detail
  const handleRowClick = useCallback((customerId: string) => {
    router.push(`/org/${slug}/customers/${customerId}` as Route);
  }, [router, slug]);

  // Toggle segment filter
  const toggleSegmentFilter = useCallback((segment: SegmentFilter) => {
    setSegmentFilter(prev => prev === segment ? "all" : segment);
    setPage(1);
  }, []);

  // Bulk delete mutation
  const bulkDeleteMutation = trpc.customer.bulkDelete.useMutation({
    onSuccess: (result) => {
      utils.customer.list.invalidate();
      utils.customer.getStats.invalidate();
      clearSelection();
      toast.success(`${result.deletedCount} customers deleted`);
    },
    onError: (error) => {
      toast.error(`Failed to delete customers: ${error.message}`);
    },
  });

  // Bulk action handlers
  const handleBulkDelete = async () => {
    const selectedItems = getSelectedItems();
    const confirmed = await confirm({
      title: `Delete ${selectedItems.length} Customers`,
      description: `This will permanently delete ${selectedItems.length} customers and all their associated data. This action cannot be undone.`,
      confirmLabel: "Delete All",
      variant: "destructive",
    });

    if (confirmed) {
      bulkDeleteMutation.mutate({ ids: selectedItems.map(c => c.id) });
    }
  };

  const handleBulkExport = useCallback(() => {
    const selectedItems = getSelectedItems();
    // Generate CSV
    const headers = ["First Name", "Last Name", "Email", "Phone", "Source", "Created At"];
    const rows = selectedItems.map(c => [
      c.firstName,
      c.lastName || "",
      c.email || "",
      c.phone || "",
      c.source || "",
      new Date(c.createdAt).toISOString(),
    ]);

    const csv = [
      headers.join(","),
      ...rows.map(r => r.map(v => `"${v}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `customers-export-${formatLocalDateKey(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success(`Exported ${selectedItems.length} customers`);
    clearSelection();
  }, [getSelectedItems, clearSelection]);

  const handleBulkTag = useCallback(() => {
    // For now, just show a toast - full implementation would open a dialog
    toast.info("Tag dialog coming soon - select tags to apply");
  }, []);

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-destructive">Failed to load customers</p>
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
    <div className="space-y-4 md:space-y-6">
      {/* Header: Title + Stats + Add Customer - Responsive */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-between sm:justify-start gap-4 sm:gap-6">
          <h1 className="text-lg font-semibold text-foreground">Customers</h1>
          {/* Inline Stats - Hidden on mobile */}
          {stats && (
            <div className="hidden sm:flex items-center gap-5 text-sm text-muted-foreground">
              <span><span className="font-medium text-foreground">{stats.total}</span> total</span>
              <span><span className="font-medium text-success">+{stats.thisMonth}</span> this month</span>
            </div>
          )}
          {/* Mobile Add button */}
          <button
            onClick={() => setShowAddCustomer(true)}
            className="sm:hidden inline-flex items-center justify-center h-10 w-10 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors touch-target"
            aria-label="Add customer"
          >
            <UserPlus className="h-5 w-5" />
          </button>
        </div>

        {/* Desktop Add button */}
        <button
          onClick={() => setShowAddCustomer(true)}
          className="hidden sm:inline-flex items-center gap-1.5 h-9 px-4 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <UserPlus className="h-4 w-4" />
          Add Customer
        </button>
      </header>

      {/* Mobile Stats Row */}
      {stats && (
        <div className="sm:hidden flex items-center justify-between px-3 py-2 rounded-lg bg-muted/50 border border-border/50">
          <div className="flex items-center gap-4 text-xs">
            <span><span className="font-semibold text-foreground">{stats.total}</span> <span className="text-muted-foreground">total</span></span>
            <span><span className="font-semibold text-success">+{stats.thisMonth}</span> <span className="text-muted-foreground">this month</span></span>
          </div>
        </div>
      )}

      {/* Filter Bar - Responsive */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3" role="search" aria-label="Filter customers">
          {/* Search */}
          <div className="relative flex-1">
            <input
              ref={searchInputRef}
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search customers... (press / to focus)"
              aria-label="Search customers"
              className="w-full h-10 sm:h-9 pl-3 pr-8 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                aria-label="Clear search"
              >
                <span aria-hidden="true">×</span>
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
            aria-label="Filter by source"
            className="h-10 sm:h-9 px-3 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            {SOURCE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.value === "all" ? "Source" : opt.label}
              </option>
            ))}
          </select>

          {/* Column Picker - Desktop only */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3 text-sm border border-input rounded-md bg-background hover:bg-accent transition-colors"
                aria-label="Customize columns"
              >
                <Settings2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Columns</span>
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-48 p-2">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground px-2 py-1">Toggle columns</p>
                {COLUMN_CONFIG.map((column) => (
                  <button
                    key={column.id}
                    onClick={() => toggleColumn(column.id)}
                    disabled={column.id === "customer"} // Customer column is always visible
                    className={cn(
                      "flex items-center justify-between w-full px-2 py-1.5 text-sm rounded-md transition-colors",
                      "hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed",
                      isColumnVisible(column.id) && "text-foreground",
                      !isColumnVisible(column.id) && "text-muted-foreground"
                    )}
                  >
                    <span>{column.label}</span>
                    {isColumnVisible(column.id) && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Segment Filter Chips */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground hidden sm:inline">Quick filters:</span>
          {SEGMENT_FILTERS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => toggleSegmentFilter(value)}
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
                segmentFilter === value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              )}
              aria-pressed={segmentFilter === value}
            >
              <Icon className="h-3 w-3" />
              {label}
            </button>
          ))}
          {segmentFilter !== "all" && (
            <button
              onClick={() => setSegmentFilter("all")}
              className="text-xs text-muted-foreground hover:text-foreground underline ml-1"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Content: Mobile Cards or Desktop Table */}
      {isLoading ? (
        isMobile ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <CustomerMobileCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <TableSkeleton rows={10} columns={6} />
        )
      ) : filteredData.length === 0 ? (
        <div className="rounded-lg border border-border bg-card">
          {search || segmentFilter !== "all" ? (
            <NoResultsEmpty searchTerm={search || segmentFilter} />
          ) : (
            <NoCustomersEmpty orgSlug={slug} />
          )}
        </div>
      ) : isMobile ? (
        /* Mobile: Card List View */
        <div className="space-y-3">
          {filteredData.map((customer) => (
            <CustomerMobileCard
              key={customer.id}
              customer={{
                id: customer.id,
                firstName: customer.firstName,
                lastName: customer.lastName ?? '',
                email: customer.email,
                phone: customer.phone,
                totalBookings: 0,
                totalSpent: '0',
                lastBookingAt: null,
              }}
              orgSlug={slug}
            />
          ))}
        </div>
      ) : (
        /* Desktop: Table View with Keyboard Navigation */
        <>
          <div {...containerProps}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    <SelectAllCheckbox
                      checked={checkboxState}
                      onChange={toggleAll}
                    />
                  </TableHead>
                  {isColumnVisible("customer") && <TableHead>Customer</TableHead>}
                  {isColumnVisible("phone") && <TableHead>Phone</TableHead>}
                  {isColumnVisible("email") && <TableHead>Email</TableHead>}
                  {isColumnVisible("source") && <TableHead>Source</TableHead>}
                  {isColumnVisible("created") && <TableHead>Created</TableHead>}
                  <TableHead className="text-right w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((customer, index) => {
                  const rowProps = getRowProps(index);
                  return (
                    <TableRow
                      key={customer.id}
                      onClick={() => handleRowClick(customer.id)}
                      className={cn(
                        "cursor-pointer group",
                        rowProps["data-focused"] && "bg-muted/70 ring-1 ring-primary/50",
                        isSelected(customer.id) && "bg-primary/5"
                      )}
                      {...rowProps}
                    >
                      {/* Selection Checkbox */}
                      <TableCell onClick={(e) => e.stopPropagation()} className="w-[40px]">
                        <SelectRowCheckbox
                          checked={isSelected(customer.id)}
                          onChange={() => toggleItem(customer.id)}
                        />
                      </TableCell>
                      {/* Customer: First name prominent, last name secondary */}
                      {isColumnVisible("customer") && (
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <span className="text-primary font-medium text-sm">
                                {customer.firstName?.[0]?.toUpperCase() ?? '?'}
                              </span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-foreground truncate">
                                  {customer.firstName}
                                  {customer.lastName && (
                                    <span className="font-normal text-muted-foreground ml-1">
                                      {customer.lastName}
                                    </span>
                                  )}
                                </span>
                                {/* Hover indicator */}
                                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                              {customer.tags && customer.tags.length > 0 && (
                                <div className="flex gap-1 mt-0.5">
                                  {customer.tags.slice(0, 2).map((tag) => (
                                    <span
                                      key={tag}
                                      className={cn(
                                        "inline-flex items-center px-1.5 py-0 rounded text-[10px]",
                                        tag === "vip"
                                          ? "bg-primary/10 text-primary"
                                          : "bg-muted text-muted-foreground"
                                      )}
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                  {customer.tags.length > 2 && (
                                    <span className="text-[10px] text-muted-foreground">
                                      +{customer.tags.length - 2}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                      )}
                      {/* Phone with copy */}
                      {isColumnVisible("phone") && (
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          {customer.phone ? (
                            <div className="flex items-center gap-1.5 group/phone">
                              <a
                                href={`tel:${customer.phone}`}
                                className="inline-flex items-center gap-1.5 text-sm text-foreground hover:text-primary transition-colors font-mono"
                              >
                                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                                {customer.phone}
                              </a>
                              <button
                                onClick={() => handleCopy(customer.phone!, "Phone")}
                                className="p-1 text-muted-foreground hover:text-foreground opacity-0 group-hover/phone:opacity-100 transition-opacity"
                                title="Copy phone"
                              >
                                <Copy className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      )}
                      {/* Email with copy */}
                      {isColumnVisible("email") && (
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          {customer.email ? (
                            <div className="flex items-center gap-1.5 group/email max-w-[200px]">
                              <a
                                href={`mailto:${customer.email}`}
                                className="text-sm text-muted-foreground hover:text-primary transition-colors truncate"
                              >
                                {customer.email}
                              </a>
                              <button
                                onClick={() => handleCopy(customer.email!, "Email")}
                                className="p-1 text-muted-foreground hover:text-foreground opacity-0 group-hover/email:opacity-100 transition-opacity flex-shrink-0"
                                title="Copy email"
                              >
                                <Copy className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      )}
                      {isColumnVisible("source") && (
                        <TableCell>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">
                            {customer.source ? customer.source.charAt(0).toUpperCase() + customer.source.slice(1) : "—"}
                          </span>
                        </TableCell>
                      )}
                      {isColumnVisible("created") && (
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {formatDate(customer.createdAt)}
                          </span>
                        </TableCell>
                      )}
                      {/* Consolidated Actions: Quick View + Overflow Menu */}
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {/* Primary Action: Quick View */}
                          <button
                            onClick={() => setSelectedCustomerId(customer.id)}
                            className={cn(
                              "inline-flex items-center justify-center rounded-md p-2",
                              "text-muted-foreground hover:text-foreground hover:bg-accent",
                              "transition-all duration-150 hover:scale-105 active:scale-95",
                              "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            )}
                            title="Quick View (360°)"
                          >
                            <Focus className="h-4 w-4" />
                          </button>

                          {/* Overflow Menu */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                className={cn(
                                  "inline-flex items-center justify-center rounded-md p-2",
                                  "text-muted-foreground hover:text-foreground hover:bg-accent",
                                  "transition-all duration-150 hover:scale-105 active:scale-95",
                                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                )}
                                aria-label="More actions"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem asChild>
                                <Link href={`/org/${slug}/customers/${customer.id}` as Route}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Profile
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/org/${slug}/customers/${customer.id}/edit` as Route}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </Link>
                              </DropdownMenuItem>
                              {customer.email && (
                                <DropdownMenuItem onClick={() => window.open(`mailto:${customer.email}`)}>
                                  <Mail className="h-4 w-4 mr-2" />
                                  Send Email
                                </DropdownMenuItem>
                              )}
                              {customer.phone && (
                                <DropdownMenuItem onClick={() => window.open(`tel:${customer.phone}`)}>
                                  <Phone className="h-4 w-4 mr-2" />
                                  Call
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDelete(customer.id)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
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

          {/* Keyboard Shortcuts Help */}
          <div className="text-xs text-muted-foreground text-center pt-2 hidden sm:block">
            <span className="opacity-60">Keyboard: </span>
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono mx-1">/</kbd>
            <span className="opacity-60">search</span>
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono mx-1">j/k</kbd>
            <span className="opacity-60">navigate</span>
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono mx-1">Enter</kbd>
            <span className="opacity-60">open</span>
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono mx-1">n</kbd>
            <span className="opacity-60">new</span>
          </div>
        </>
      )}

      {ConfirmModal}

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedCount}
        totalCount={filteredData.length}
        onClearSelection={clearSelection}
        actions={[
          {
            label: "Add Tags",
            icon: <Tag className="h-4 w-4" />,
            onClick: handleBulkTag,
          },
          {
            label: "Export",
            icon: <Download className="h-4 w-4" />,
            onClick: handleBulkExport,
          },
          {
            label: "Delete",
            icon: <Trash2 className="h-4 w-4" />,
            onClick: handleBulkDelete,
            variant: "destructive",
            loading: bulkDeleteMutation.isPending,
          },
        ]}
      />

      {/* Customer 360 Sheet */}
      {selectedCustomerId && (
        <Customer360Sheet
          customerId={selectedCustomerId}
          orgSlug={slug}
          open={!!selectedCustomerId}
          onOpenChange={(open) => !open && setSelectedCustomerId(null)}
        />
      )}

      {/* Add Customer Sheet */}
      <AddCustomerSheet
        open={showAddCustomer}
        onOpenChange={setShowAddCustomer}
        onSuccess={(customer) => {
          // Optionally navigate to the new customer or show their 360 view
          setSelectedCustomerId(customer.id);
        }}
      />
    </div>
  );
}
