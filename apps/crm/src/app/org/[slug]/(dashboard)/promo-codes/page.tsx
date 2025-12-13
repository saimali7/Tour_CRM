"use client";

import { trpc } from "@/lib/trpc";
import {
  Tag,
  Plus,
  Edit,
  Trash2,
  Eye,
  Search,
  Copy,
  Loader2,
  CheckCircle,
  X,
  Sparkles,
  Calendar,
  DollarSign,
  Users,
  Percent,
} from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useConfirmModal, ConfirmModal } from "@/components/ui/confirm-modal";

type StatusFilter = "all" | "active" | "inactive" | "expired";
type DiscountType = "percentage" | "fixed";
type AppliesTo = "all" | "specific";

interface PromoCodeForm {
  code: string;
  description: string;
  discountType: DiscountType;
  discountValue: number;
  validFrom: string;
  validUntil: string;
  maxUses: number | null;
  maxUsesPerCustomer: number | null;
  minBookingAmount: number | null;
  appliesTo: AppliesTo;
  tourIds: string[];
  isActive: boolean;
}

export default function PromoCodesPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const { confirm, ConfirmModal } = useConfirmModal();

  const [form, setForm] = useState<PromoCodeForm>({
    code: "",
    description: "",
    discountType: "percentage",
    discountValue: 0,
    validFrom: "",
    validUntil: "",
    maxUses: null,
    maxUsesPerCustomer: null,
    minBookingAmount: null,
    appliesTo: "all",
    tourIds: [],
    isActive: true,
  });

  const { data, isLoading, error } = trpc.promoCode.list.useQuery({
    pagination: { page, limit: 20 },
    filters: {
      search: search || undefined,
      status: statusFilter === "all" ? undefined : statusFilter,
    },
  });

  const { data: stats } = trpc.promoCode.getStats.useQuery();
  const { data: tours } = trpc.tour.list.useQuery({
    pagination: { page: 1, limit: 100 },
    filters: { status: "active" },
  });

  const utils = trpc.useUtils();

  const createMutation = trpc.promoCode.create.useMutation({
    onSuccess: () => {
      utils.promoCode.list.invalidate();
      utils.promoCode.getStats.invalidate();
      setShowModal(false);
      resetForm();
      showSuccessMessage();
    },
  });

  const updateMutation = trpc.promoCode.update.useMutation({
    onSuccess: () => {
      utils.promoCode.list.invalidate();
      setShowModal(false);
      setEditingId(null);
      resetForm();
      showSuccessMessage();
    },
  });

  const deleteMutation = trpc.promoCode.delete.useMutation({
    onSuccess: () => {
      utils.promoCode.list.invalidate();
      utils.promoCode.getStats.invalidate();
      showSuccessMessage();
    },
  });

  const showSuccessMessage = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const resetForm = () => {
    setForm({
      code: "",
      description: "",
      discountType: "percentage",
      discountValue: 0,
      validFrom: "",
      validUntil: "",
      maxUses: null,
      maxUsesPerCustomer: null,
      minBookingAmount: null,
      appliesTo: "all",
      tourIds: [],
      isActive: true,
    });
  };

  const generateCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setForm((prev) => ({ ...prev, code }));
  };

  const handleEdit = (promo: any) => {
    setEditingId(promo.id);
    setForm({
      code: promo.code,
      description: promo.description || "",
      discountType: promo.discountType,
      discountValue: parseFloat(promo.discountValue),
      validFrom: promo.validFrom ? new Date(promo.validFrom).toISOString().split('T')[0]! : "",
      validUntil: promo.validUntil ? new Date(promo.validUntil).toISOString().split('T')[0]! : "",
      maxUses: promo.maxUses ?? null,
      maxUsesPerCustomer: promo.maxUsesPerCustomer ?? null,
      minBookingAmount: promo.minBookingAmount ? parseFloat(promo.minBookingAmount) : null,
      appliesTo: promo.appliesTo,
      tourIds: promo.tourIds || [],
      isActive: promo.isActive,
    });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Convert string dates to Date objects and handle null/undefined properly
    const formData = {
      code: form.code,
      description: form.description || undefined,
      discountType: form.discountType,
      discountValue: form.discountValue,
      validFrom: form.validFrom ? new Date(form.validFrom) : undefined,
      validUntil: form.validUntil ? new Date(form.validUntil) : undefined,
      maxUses: form.maxUses ?? undefined,
      maxUsesPerCustomer: form.maxUsesPerCustomer ?? undefined,
      minBookingAmount: form.minBookingAmount ?? undefined,
      appliesTo: form.appliesTo,
      tourIds: form.tourIds,
      isActive: form.isActive,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: "Delete Promo Code",
      description: "This will permanently delete this promo code. Existing bookings using this code will not be affected, but customers will no longer be able to use it for new bookings. This action cannot be undone.",
      confirmLabel: "Delete Promo Code",
      variant: "destructive",
    });

    if (confirmed) {
      deleteMutation.mutate({ id });
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    showSuccessMessage();
  };

  const formatDate = (date: string | Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(date));
  };

  const getStatusColor = (promo: any) => {
    if (!promo.isActive) return "bg-gray-100 text-gray-800";
    const now = new Date();
    if (promo.validUntil) {
      const validUntil = new Date(promo.validUntil);
      if (validUntil < now) return "bg-red-100 text-red-800";
    }
    if (promo.maxUses && promo.currentUses && promo.currentUses >= promo.maxUses)
      return "bg-orange-100 text-orange-800";
    return "bg-green-100 text-green-800";
  };

  const getStatusLabel = (promo: any) => {
    if (!promo.isActive) return "Inactive";
    const now = new Date();
    if (promo.validUntil) {
      const validUntil = new Date(promo.validUntil);
      if (validUntil < now) return "Expired";
    }
    if (promo.maxUses && promo.currentUses && promo.currentUses >= promo.maxUses) return "Used Up";
    return "Active";
  };

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <p className="text-red-600">Error loading promo codes: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Promo Codes</h1>
          <p className="text-gray-500 mt-1">Create and manage discount codes</p>
        </div>
        <div className="flex items-center gap-3">
          {saveSuccess && (
            <div className="flex items-center gap-2 text-green-600 bg-green-50 px-4 py-2 rounded-lg">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">Success</span>
            </div>
          )}
          <button
            onClick={() => {
              resetForm();
              setEditingId(null);
              setShowModal(true);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create Code
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Tag className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Codes</p>
                <p className="text-xl font-semibold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Active</p>
                <p className="text-xl font-semibold text-gray-900">{stats.active}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Uses</p>
                <p className="text-xl font-semibold text-gray-900">{stats.totalUses}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Discount</p>
                <p className="text-xl font-semibold text-gray-900">
                  ${stats.totalDiscount.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by code or description..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
          />
        </div>

        <div className="flex gap-2">
          {(["all", "active", "inactive", "expired"] as const).map((status) => (
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
            <Tag className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No promo codes yet</h3>
            <p className="mt-2 text-gray-500">
              Create promo codes to offer discounts to your customers.
            </p>
            <button
              onClick={() => {
                resetForm();
                setEditingId(null);
                setShowModal(true);
              }}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Create Code
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Discount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valid Dates
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data?.data.map((promo) => (
                  <tr key={promo.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div>
                          <div className="text-sm font-mono font-semibold text-gray-900">
                            {promo.code}
                          </div>
                          {promo.description && (
                            <div className="text-xs text-gray-500">{promo.description}</div>
                          )}
                        </div>
                        <button
                          onClick={() => copyToClipboard(promo.code)}
                          className="p-1 text-gray-400 hover:text-gray-600"
                          title="Copy code"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {promo.discountValue}
                        {promo.discountType === "percentage" ? "%" : " USD"} off
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex flex-col">
                        {promo.validFrom && <span>{formatDate(promo.validFrom)}</span>}
                        {promo.validUntil && (
                          <span className="text-xs text-gray-400">
                            to {formatDate(promo.validUntil)}
                          </span>
                        )}
                        {!promo.validFrom && !promo.validUntil && <span>No expiry</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {promo.currentUses || 0}
                      {promo.maxUses ? ` / ${promo.maxUses}` : " uses"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                          promo
                        )}`}
                      >
                        {getStatusLabel(promo)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/org/${slug}/promo-codes/${promo.id}` as Route}
                          className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => handleEdit(promo)}
                          className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(promo.id)}
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
                Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, data.total)} of{" "}
                {data.total} promo codes
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

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingId ? "Edit Promo Code" : "Create Promo Code"}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingId(null);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Code *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={form.code}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))
                    }
                    required
                    placeholder="e.g., SUMMER2025"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary font-mono"
                  />
                  <button
                    type="button"
                    onClick={generateCode}
                    className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    <Sparkles className="h-4 w-4" />
                    Generate
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Brief description of this promo"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Discount Type *
                  </label>
                  <select
                    value={form.discountType}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        discountType: e.target.value as DiscountType,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  >
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed Amount</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Discount Value *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.discountValue}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          discountValue: parseFloat(e.target.value) || 0,
                        }))
                      }
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      {form.discountType === "percentage" ? "%" : "$"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valid From *
                  </label>
                  <input
                    type="date"
                    value={form.validFrom}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, validFrom: e.target.value }))
                    }
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valid Until *
                  </label>
                  <input
                    type="date"
                    value={form.validUntil}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, validUntil: e.target.value }))
                    }
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Uses
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={form.maxUses ?? ""}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        maxUses: e.target.value ? parseInt(e.target.value) : null,
                      }))
                    }
                    placeholder="Unlimited"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Uses Per Customer
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={form.maxUsesPerCustomer ?? ""}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        maxUsesPerCustomer: e.target.value ? parseInt(e.target.value) : null,
                      }))
                    }
                    placeholder="Unlimited"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Min Booking Amount
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.minBookingAmount ?? ""}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        minBookingAmount: e.target.value
                          ? parseFloat(e.target.value)
                          : null,
                      }))
                    }
                    placeholder="No minimum"
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Applies To *
                </label>
                <select
                  value={form.appliesTo}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      appliesTo: e.target.value as AppliesTo,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="all">All Tours</option>
                  <option value="specific">Specific Tours</option>
                </select>
              </div>

              {form.appliesTo === "specific" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Tours *
                  </label>
                  <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                    {tours?.data.map((tour) => (
                      <label key={tour.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.tourIds.includes(tour.id)}
                          onChange={(e) => {
                            setForm((prev) => ({
                              ...prev,
                              tourIds: e.target.checked
                                ? [...prev.tourIds, tour.id]
                                : prev.tourIds.filter((id) => id !== tour.id),
                            }));
                          }}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <span className="text-sm text-gray-700">{tour.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, isActive: e.target.checked }))
                    }
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-gray-700">Active</span>
                </label>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingId(null);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
                >
                  {createMutation.isPending || updateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  {editingId ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {ConfirmModal}
    </div>
  );
}
