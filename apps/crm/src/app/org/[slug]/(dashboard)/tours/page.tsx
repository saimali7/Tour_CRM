"use client";

import { trpc } from "@/lib/trpc";
import { Map, Plus, Edit, Trash2, Eye, Archive, Check, Copy } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { useParams } from "next/navigation";
import { useState } from "react";
import { TableSkeleton } from "@/components/ui/skeleton";
import { NoToursEmpty } from "@/components/ui/empty-state";
import { useConfirmModal, ConfirmModal } from "@/components/ui/confirm-modal";
import { toast } from "sonner";

type StatusFilter = "all" | "draft" | "active" | "paused" | "archived";

export default function ToursPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const { confirm, ConfirmModal } = useConfirmModal();

  const { data, isLoading, error } = trpc.tour.list.useQuery({
    pagination: { page, limit: 10 },
    filters: statusFilter === "all" ? undefined : { status: statusFilter },
  });

  const utils = trpc.useUtils();

  const deleteMutation = trpc.tour.delete.useMutation({
    onSuccess: () => {
      utils.tour.list.invalidate();
      toast.success("Tour deleted successfully");
    },
    onError: (error) => {
      toast.error(`Failed to delete tour: ${error.message}`);
    },
  });

  const archiveMutation = trpc.tour.archive.useMutation({
    onSuccess: () => {
      utils.tour.list.invalidate();
      toast.success("Tour archived successfully");
    },
    onError: (error) => {
      toast.error(`Failed to archive tour: ${error.message}`);
    },
  });

  const publishMutation = trpc.tour.publish.useMutation({
    onSuccess: () => {
      utils.tour.list.invalidate();
      toast.success("Tour published successfully");
    },
    onError: (error) => {
      toast.error(`Failed to publish tour: ${error.message}`);
    },
  });

  const duplicateMutation = trpc.tour.duplicate.useMutation({
    onSuccess: () => {
      utils.tour.list.invalidate();
      toast.success("Tour duplicated successfully");
    },
    onError: (error) => {
      toast.error(`Failed to duplicate tour: ${error.message}`);
    },
  });

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: "Delete Tour",
      description: "This will permanently delete this tour and all its schedules. This action cannot be undone.",
      confirmLabel: "Delete Tour",
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
    publishMutation.mutate({ id });
  };

  const handleDuplicate = (id: string, name: string) => {
    duplicateMutation.mutate({ id, newName: `${name} (Copy)` });
  };

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <p className="text-red-600">Error loading tours: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tours</h1>
          <p className="text-gray-500 mt-1">Manage your tour offerings</p>
        </div>
        <Link
          href={`/org/${slug}/tours/new` as Route}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create Tour
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(["all", "draft", "active", "paused", "archived"] as const).map((status) => (
          <button
            key={status}
            onClick={() => {
              setStatusFilter(status);
              setPage(1);
            }}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              statusFilter === status
                ? "bg-primary text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <TableSkeleton rows={10} columns={6} />
      ) : data?.data.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white">
          <NoToursEmpty orgSlug={slug} />
        </div>
      ) : (
        <>
          <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tour
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Capacity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data?.data.map((tour) => (
                  <tr key={tour.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {tour.name}
                        </div>
                        <div className="text-sm text-gray-500">{tour.slug}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          tour.status === "active"
                            ? "bg-green-100 text-green-800"
                            : tour.status === "draft"
                            ? "bg-yellow-100 text-yellow-800"
                            : tour.status === "paused"
                            ? "bg-orange-100 text-orange-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {tour.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {tour.durationMinutes} min
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {tour.minParticipants ?? 1} - {tour.maxParticipants}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ${parseFloat(tour.basePrice).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/org/${slug}/tours/${tour.id}` as Route}
                          className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                          title="View"
                          aria-label="View tour details"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/org/${slug}/tours/${tour.id}/edit` as Route}
                          className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                          title="Edit"
                          aria-label="Edit tour"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => handleDuplicate(tour.id, tour.name)}
                          className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded"
                          title="Duplicate"
                          aria-label="Duplicate tour"
                          disabled={duplicateMutation.isPending}
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        {tour.status === "draft" && (
                          <button
                            onClick={() => handlePublish(tour.id)}
                            className="p-1.5 text-green-500 hover:text-green-700 hover:bg-green-50 rounded"
                            title="Publish"
                            aria-label="Publish tour"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        )}
                        {tour.status === "active" && (
                          <button
                            onClick={() => handleArchive(tour.id)}
                            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                            title="Archive"
                            aria-label="Archive tour"
                          >
                            <Archive className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(tour.id)}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                          title="Delete"
                          aria-label="Delete tour"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Showing {(page - 1) * 10 + 1} to{" "}
                {Math.min(page * 10, data.total)} of {data.total} tours
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                  disabled={page >= data.totalPages}
                  className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {ConfirmModal}
    </div>
  );
}
