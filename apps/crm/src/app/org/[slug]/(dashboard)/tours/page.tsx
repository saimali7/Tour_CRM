"use client";

import { trpc } from "@/lib/trpc";
import { Map, Plus, Edit, Trash2, Eye, Archive, Check } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { useParams } from "next/navigation";
import { useState } from "react";

type StatusFilter = "all" | "draft" | "active" | "paused" | "archived";

export default function ToursPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const { data, isLoading, error } = trpc.tour.list.useQuery({
    pagination: { page, limit: 10 },
    filters: statusFilter === "all" ? undefined : { status: statusFilter },
  });

  const utils = trpc.useUtils();

  const deleteMutation = trpc.tour.delete.useMutation({
    onSuccess: () => {
      utils.tour.list.invalidate();
    },
  });

  const archiveMutation = trpc.tour.archive.useMutation({
    onSuccess: () => {
      utils.tour.list.invalidate();
    },
  });

  const publishMutation = trpc.tour.publish.useMutation({
    onSuccess: () => {
      utils.tour.list.invalidate();
    },
  });

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this tour?")) {
      deleteMutation.mutate({ id });
    }
  };

  const handleArchive = (id: string) => {
    archiveMutation.mutate({ id });
  };

  const handlePublish = (id: string) => {
    publishMutation.mutate({ id });
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
        <div className="rounded-lg border border-gray-200 bg-white p-12">
          <div className="flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        </div>
      ) : data?.data.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="p-12 text-center">
            <Map className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              No tours yet
            </h3>
            <p className="mt-2 text-gray-500">
              Get started by creating your first tour product.
            </p>
            <Link
              href={`/org/${slug}/tours/new` as Route}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Create Tour
            </Link>
          </div>
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
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/org/${slug}/tours/${tour.id}/edit` as Route}
                          className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        {tour.status === "draft" && (
                          <button
                            onClick={() => handlePublish(tour.id)}
                            className="p-1.5 text-green-500 hover:text-green-700 hover:bg-green-50 rounded"
                            title="Publish"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        )}
                        {tour.status === "active" && (
                          <button
                            onClick={() => handleArchive(tour.id)}
                            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                            title="Archive"
                          >
                            <Archive className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(tour.id)}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                          title="Delete"
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
    </div>
  );
}
