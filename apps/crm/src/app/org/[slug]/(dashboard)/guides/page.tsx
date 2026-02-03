"use client";

import { trpc } from "@/lib/trpc";
import {
  Eye,
  Edit,
  Trash2,
  Mail,
  Phone,
  Users,
  Globe,
  AlertTriangle,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { useParams, useRouter } from "next/navigation";
import { useState, useCallback, useMemo } from "react";

// Design system components
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
  SelectAllCheckbox,
  SelectRowCheckbox,
  BulkActionBar,
  useTableSelection,
} from "@/components/ui/data-table";
import { TableSkeleton } from "@/components/ui/skeleton";
import { NoGuidesEmpty, NoResultsEmpty } from "@/components/ui/empty-state";
import { useConfirmModal } from "@/components/ui/confirm-modal";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { GuideStatusEditor } from "@/components/guides/guide-status-editor";
import { useKeyboardNavigation, useHotkeys } from "@/hooks";
import { cn } from "@/lib/utils";

// =============================================================================
// LANGUAGE UTILITIES
// =============================================================================

const LANGUAGE_MAP: Record<string, { name: string; flag: string }> = {
  en: { name: "English", flag: "🇬🇧" },
  es: { name: "Spanish", flag: "🇪🇸" },
  fr: { name: "French", flag: "🇫🇷" },
  de: { name: "German", flag: "🇩🇪" },
  it: { name: "Italian", flag: "🇮🇹" },
  pt: { name: "Portuguese", flag: "🇵🇹" },
  zh: { name: "Chinese", flag: "🇨🇳" },
  ja: { name: "Japanese", flag: "🇯🇵" },
  ko: { name: "Korean", flag: "🇰🇷" },
  ar: { name: "Arabic", flag: "🇸🇦" },
  ru: { name: "Russian", flag: "🇷🇺" },
  nl: { name: "Dutch", flag: "🇳🇱" },
  sv: { name: "Swedish", flag: "🇸🇪" },
  no: { name: "Norwegian", flag: "🇳🇴" },
  da: { name: "Danish", flag: "🇩🇰" },
  fi: { name: "Finnish", flag: "🇫🇮" },
  pl: { name: "Polish", flag: "🇵🇱" },
  tr: { name: "Turkish", flag: "🇹🇷" },
  he: { name: "Hebrew", flag: "🇮🇱" },
  th: { name: "Thai", flag: "🇹🇭" },
  vi: { name: "Vietnamese", flag: "🇻🇳" },
  id: { name: "Indonesian", flag: "🇮🇩" },
  ms: { name: "Malay", flag: "🇲🇾" },
  hi: { name: "Hindi", flag: "🇮🇳" },
};

function getLanguageDisplay(code: string): { name: string; flag: string } {
  const lower = code.toLowerCase();
  return LANGUAGE_MAP[lower] || { name: code.toUpperCase(), flag: "🌐" };
}

// =============================================================================
// TYPES
// =============================================================================

type StatusFilter = "all" | "active" | "inactive" | "on_leave";
type SortField = "lastName" | "createdAt";
type SortDirection = "asc" | "desc";
type GuideStatus = "active" | "inactive" | "on_leave";

interface Guide {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  status: string;
  isPublic: boolean | null;
  languages: string[] | null;
  createdAt: Date;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "on_leave", label: "On Leave" },
];

// =============================================================================
// COMPONENT
// =============================================================================

export default function GuidesPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const confirmModal = useConfirmModal();

  // State
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [languageFilter, setLanguageFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Queries
  const { data, isLoading, error } = trpc.guide.list.useQuery({
    pagination: { page, limit: 20 },
    filters: {
      search: search || undefined,
      status: statusFilter === "all" ? undefined : statusFilter,
      language: languageFilter === "all" ? undefined : languageFilter,
    },
    sort: { field: sortField, direction: sortDirection },
  });

  const { data: stats } = trpc.guide.getStats.useQuery();
  const { data: languages } = trpc.guide.getAllLanguages.useQuery();

  const utils = trpc.useUtils();

  // Mutations
  const deleteMutation = trpc.guide.delete.useMutation({
    onSuccess: () => {
      utils.guide.list.invalidate();
      utils.guide.getStats.invalidate();
      selection.clearSelection();
    },
  });

  const activateMutation = trpc.guide.activate.useMutation({
    onSuccess: () => {
      utils.guide.list.invalidate();
      utils.guide.getStats.invalidate();
    },
  });

  const deactivateMutation = trpc.guide.deactivate.useMutation({
    onSuccess: () => {
      utils.guide.list.invalidate();
      utils.guide.getStats.invalidate();
    },
  });

  const setOnLeaveMutation = trpc.guide.setOnLeave.useMutation({
    onSuccess: () => {
      utils.guide.list.invalidate();
      utils.guide.getStats.invalidate();
    },
  });

  // Selection
  const guides = data?.data || [];
  const selection = useTableSelection({
    items: guides,
    getItemId: (guide) => guide.id,
  });

  // Keyboard navigation
  const keyboard = useKeyboardNavigation({
    items: guides,
    getItemId: (guide) => guide.id,
    onOpen: (guide) => router.push(`/org/${slug}/guides/${guide.id}` as Route),
    onSelect: (guide) => selection.toggleItem(guide.id),
    onEdit: (guide) => router.push(`/org/${slug}/guides/${guide.id}/edit` as Route),
    onDelete: (guide) => handleDelete(guide.id),
    enabled: !isLoading && guides.length > 0,
  });

  // Global hotkeys
  useHotkeys({
    "mod+n": () => router.push(`/org/${slug}/guides/new` as Route),
    "mod+f": () => document.querySelector<HTMLInputElement>('[data-search-input]')?.focus(),
    "mod+a": () => selection.selectAll(),
    "escape": () => selection.clearSelection(),
  });

  // Handlers
  const handleDelete = async (id: string) => {
    const confirmed = await confirmModal.confirm({
      title: "Delete Guide",
      description: "This will permanently delete this guide and remove them from all future assignments. This action cannot be undone.",
      confirmLabel: "Delete",
      variant: "destructive",
    });

    if (confirmed) {
      deleteMutation.mutate({ id });
    }
  };

  const handleBulkDelete = async () => {
    const count = selection.selectedCount;
    const confirmed = await confirmModal.confirm({
      title: `Delete ${count} Guide${count > 1 ? "s" : ""}`,
      description: `This will permanently delete ${count} guide${count > 1 ? "s" : ""} and remove them from all future assignments. This action cannot be undone.`,
      confirmLabel: "Delete All",
      variant: "destructive",
    });

    if (confirmed) {
      const ids = Array.from(selection.selectedIds);
      await Promise.all(ids.map((id) => deleteMutation.mutateAsync({ id })));
    }
  };

  const handleBulkStatusChange = async (status: GuideStatus) => {
    const ids = Array.from(selection.selectedIds);
    const mutations = {
      active: activateMutation,
      inactive: deactivateMutation,
      on_leave: setOnLeaveMutation,
    };
    await Promise.all(ids.map((id) => mutations[status].mutateAsync({ id })));
    selection.clearSelection();
  };

  const handleStatusChange = async (guideId: string, newStatus: GuideStatus) => {
    const mutations = {
      active: activateMutation,
      inactive: deactivateMutation,
      on_leave: setOnLeaveMutation,
    };
    await mutations[newStatus].mutateAsync({ id: guideId });
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setPage(1);
  };

  const handleRowClick = useCallback(
    (guide: Guide, e: React.MouseEvent) => {
      // Don't navigate if clicking on interactive elements
      const target = e.target as HTMLElement;
      if (
        target.closest("button") ||
        target.closest("a") ||
        target.closest('[role="checkbox"]') ||
        target.closest("[data-popover]")
      ) {
        return;
      }
      router.push(`/org/${slug}/guides/${guide.id}` as Route);
    },
    [router, slug]
  );

  // Formatters
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(date));
  };

  const getStatusVariant = (status: string): "success" | "warning" | "neutral" => {
    switch (status) {
      case "active":
        return "success";
      case "on_leave":
        return "warning";
      default:
        return "neutral";
    }
  };

  // Error state
  if (error) {
    return (
      <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-destructive">Failed to load guides</p>
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
      {/* Header: Team Title + Tabs + Add Guide */}
      <header className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <h1 className="text-lg font-semibold text-foreground">
              <span className="sr-only">Guides</span>
              Team
            </h1>
            {/* Inline Stats */}
            {stats && (
              <div className="hidden sm:flex items-center gap-4 text-sm text-muted-foreground">
                <span>
                  <span className="font-medium text-foreground">{stats.total}</span> total
                </span>
                <span className="text-border">·</span>
                <span>
                  <span className="font-medium text-emerald-600">{stats.active}</span> active
                </span>
                {stats.onLeave > 0 && (
                  <>
                    <span className="text-border">·</span>
                    <span>
                      <span className="font-medium text-yellow-600">{stats.onLeave}</span> on leave
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          <Link
            href={`/org/${slug}/guides/new` as Route}
            className="inline-flex items-center gap-1.5 h-9 px-4 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors group"
          >
            <Users className="h-4 w-4" />
            Add Guide
            <kbd className="hidden group-hover:inline-flex ml-1.5 px-1.5 py-0.5 text-[10px] font-mono bg-primary-foreground/20 rounded">
              ⌘N
            </kbd>
          </Link>
        </div>

        {/* Team Tabs */}
        <nav className="flex items-center gap-1 border-b border-border -mb-px">
          <button className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 border-primary text-foreground -mb-px">
            <Users className="h-4 w-4" />
            Guides
          </button>
          <button
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 border-transparent text-muted-foreground cursor-not-allowed opacity-50 -mb-px"
            disabled
            title="Coming soon"
          >
            Staff
          </button>
        </nav>
      </header>

      {/* Filters */}
      <FilterBar>
        <FilterSearch
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="Search by name or email..."
          data-search-input
        />
        <div className="flex items-center gap-3">
          <FilterChipGroup
            value={statusFilter}
            onChange={(value) => {
              setStatusFilter(value);
              setPage(1);
            }}
            options={STATUS_OPTIONS}
          />
          {languages && languages.length > 0 && (
            <select
              value={languageFilter}
              onChange={(e) => {
                setLanguageFilter(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by language"
              className="px-3 py-1.5 text-sm rounded-lg border border-input bg-background text-foreground hover:bg-accent focus:ring-2 focus:ring-ring focus:border-ring"
            >
              <option value="all">All Languages</option>
              {languages.map((lang) => {
                const display = getLanguageDisplay(lang);
                return (
                  <option key={lang} value={lang}>
                    {display.flag} {display.name}
                  </option>
                );
              })}
            </select>
          )}
        </div>
      </FilterBar>

      {/* Keyboard hints */}
      {!isLoading && guides.length > 0 && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground px-1">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">↑↓</kbd>
            <span>navigate</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Enter</kbd>
            <span>open</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Space</kbd>
            <span>select</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">E</kbd>
            <span>edit</span>
          </span>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <TableSkeleton rows={10} columns={7} />
      ) : guides.length === 0 ? (
        <div className="rounded-lg border border-border bg-card">
          {search ? (
            <NoResultsEmpty searchTerm={search} />
          ) : (
            <NoGuidesEmpty orgSlug={slug} />
          )}
        </div>
      ) : (
        <>
          <div {...keyboard.containerProps} className="focus:outline-none">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    <SelectAllCheckbox
                      checked={selection.checkboxState}
                      onChange={selection.toggleAll}
                    />
                  </TableHead>
                  <TableHead
                    sortable
                    sorted={sortField === "lastName" ? sortDirection : false}
                    onSort={() => handleSort("lastName")}
                  >
                    Guide
                  </TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Languages</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead
                    sortable
                    sorted={sortField === "createdAt" ? sortDirection : false}
                    onSort={() => handleSort("createdAt")}
                  >
                    Created
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {guides.map((guide, index) => (
                  <TableRow
                    key={guide.id}
                    className={cn(
                      "cursor-pointer transition-all",
                      keyboard.isFocused(index) && "ring-2 ring-primary ring-inset bg-muted/70",
                      selection.isSelected(guide.id) && "bg-primary/5"
                    )}
                    onClick={(e) => handleRowClick(guide, e)}
                    {...keyboard.getRowProps(index)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <SelectRowCheckbox
                        checked={selection.isSelected(guide.id)}
                        onChange={() => selection.toggleItem(guide.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {guide.avatarUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={guide.avatarUrl}
                            alt={`${guide.firstName} ${guide.lastName}`}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-primary font-medium">
                              {guide.firstName?.[0] ?? ''}
                              {guide.lastName?.[0] ?? ''}
                            </span>
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-medium text-foreground">
                            {guide.firstName} {guide.lastName}
                          </div>
                          {guide.isPublic && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <Globe className="h-3 w-3 text-primary" />
                              <span className="text-xs text-primary">Public</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Mail className="h-3.5 w-3.5" />
                          <a
                            href={`mailto:${guide.email}`}
                            onClick={(e) => e.stopPropagation()}
                            className="hover:text-primary transition-colors"
                          >
                            {guide.email}
                          </a>
                        </div>
                        {guide.phone && (
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Phone className="h-3.5 w-3.5" />
                            <a
                              href={`tel:${guide.phone}`}
                              onClick={(e) => e.stopPropagation()}
                              className="hover:text-primary transition-colors"
                            >
                              {guide.phone}
                            </a>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {guide.languages && guide.languages.length > 0 ? (
                          guide.languages.slice(0, 3).map((lang) => {
                            const display = getLanguageDisplay(lang);
                            return (
                              <Tooltip key={lang}>
                                <TooltipTrigger asChild>
                                  <span
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-info/10 text-info font-medium cursor-default"
                                    aria-label={display.name}
                                  >
                                    <span className="text-[10px]">{display.flag}</span>
                                    {lang.toUpperCase()}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs">
                                  {display.name}
                                </TooltipContent>
                              </Tooltip>
                            );
                          })
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                        {guide.languages && guide.languages.length > 3 && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground font-medium cursor-default">
                                +{guide.languages.length - 3}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">
                              {guide.languages.slice(3).map((l) => getLanguageDisplay(l).name).join(", ")}
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()} data-popover>
                      <GuideStatusEditor
                        status={guide.status as GuideStatus}
                        onStatusChange={(newStatus) => handleStatusChange(guide.id, newStatus)}
                      />
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(guide.createdAt)}
                      </span>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <TableActions>
                        <Link href={`/org/${slug}/guides/${guide.id}` as Route}>
                          <ActionButton tooltip="View guide">
                            <Eye className="h-4 w-4" />
                          </ActionButton>
                        </Link>
                        <Link href={`/org/${slug}/guides/${guide.id}/edit` as Route}>
                          <ActionButton tooltip="Edit guide">
                            <Edit className="h-4 w-4" />
                          </ActionButton>
                        </Link>
                        <ActionButton
                          variant="danger"
                          tooltip="Delete guide"
                          onClick={() => handleDelete(guide.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </ActionButton>
                      </TableActions>
                    </TableCell>
                  </TableRow>
                ))}
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
        </>
      )}

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selection.selectedCount}
        totalCount={guides.length}
        onClearSelection={selection.clearSelection}
        actions={[
          {
            label: "Set Active",
            icon: <CheckCircle className="h-4 w-4" />,
            onClick: () => handleBulkStatusChange("active"),
            loading: activateMutation.isPending,
          },
          {
            label: "Set On Leave",
            icon: <Clock className="h-4 w-4" />,
            onClick: () => handleBulkStatusChange("on_leave"),
            loading: setOnLeaveMutation.isPending,
          },
          {
            label: "Delete",
            icon: <Trash2 className="h-4 w-4" />,
            onClick: handleBulkDelete,
            variant: "destructive",
            loading: deleteMutation.isPending,
          },
        ]}
      />

      {confirmModal.ConfirmModal}
    </div>
  );
}
