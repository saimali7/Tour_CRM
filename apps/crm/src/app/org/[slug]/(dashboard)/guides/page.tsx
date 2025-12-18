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
} from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { useParams } from "next/navigation";
import { useState } from "react";

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
} from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { TableSkeleton } from "@/components/ui/skeleton";
import { NoGuidesEmpty, NoResultsEmpty } from "@/components/ui/empty-state";
import { useConfirmModal } from "@/components/ui/confirm-modal";

type StatusFilter = "all" | "active" | "inactive" | "on_leave";

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "on_leave", label: "On Leave" },
];

export default function GuidesPage() {
  const params = useParams();
  const slug = params.slug as string;
  const confirmModal = useConfirmModal();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [languageFilter, setLanguageFilter] = useState<string>("all");

  const { data, isLoading, error } = trpc.guide.list.useQuery({
    pagination: { page, limit: 20 },
    filters: {
      search: search || undefined,
      status: statusFilter === "all" ? undefined : statusFilter,
      language: languageFilter === "all" ? undefined : languageFilter,
    },
    sort: { field: "createdAt", direction: "desc" },
  });

  const { data: stats } = trpc.guide.getStats.useQuery();
  const { data: languages } = trpc.guide.getAllLanguages.useQuery();

  const utils = trpc.useUtils();

  const deleteMutation = trpc.guide.delete.useMutation({
    onSuccess: () => {
      utils.guide.list.invalidate();
      utils.guide.getStats.invalidate();
    },
  });

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

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "on_leave":
        return "On Leave";
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6">
        <p className="text-destructive">Error loading guides: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header: Title + Inline Stats + Add Guide */}
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <h1 className="text-lg font-semibold text-foreground">Guides</h1>
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
          className="inline-flex items-center gap-1.5 h-9 px-4 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Users className="h-4 w-4" />
          Add Guide
        </Link>
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
              className="px-3 py-1.5 text-sm rounded-lg border border-input bg-background text-foreground hover:bg-accent focus:ring-2 focus:ring-ring focus:border-ring"
            >
              <option value="all">All Languages</option>
              {languages.map((lang) => (
                <option key={lang} value={lang}>
                  {lang.toUpperCase()}
                </option>
              ))}
            </select>
          )}
        </div>
      </FilterBar>

      {/* Table */}
      {isLoading ? (
        <TableSkeleton rows={10} columns={6} />
      ) : data?.data.length === 0 ? (
        <div className="rounded-lg border border-border bg-card">
          {search ? (
            <NoResultsEmpty searchTerm={search} />
          ) : (
            <NoGuidesEmpty orgSlug={slug} />
          )}
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Guide</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Languages</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.data.map((guide) => (
                <TableRow key={guide.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {guide.avatarUrl ? (
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
                        guide.languages.map((lang) => (
                          <span
                            key={lang}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-info/10 text-info font-medium"
                          >
                            {lang.toUpperCase()}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      label={getStatusLabel(guide.status)}
                      variant={getStatusVariant(guide.status)}
                    />
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(guide.createdAt)}
                    </span>
                  </TableCell>
                  <TableCell>
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

      {confirmModal.ConfirmModal}
    </div>
  );
}
