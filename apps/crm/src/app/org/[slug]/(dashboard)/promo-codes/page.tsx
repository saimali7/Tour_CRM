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
  Package,
  CalendarClock,
  Briefcase,
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

  const handleEdit = (promo: {
    id: string;
    code: string;
    description?: string | null;
    discountType: "percentage" | "fixed";
    discountValue: string;
    validFrom?: string | Date | null;
    validUntil?: string | Date | null;
    maxUses?: number | null;
    maxUsesPerCustomer?: number | null;
    minBookingAmount?: string | null;
    appliesTo: AppliesTo;
    tourIds?: string[] | null;
    isActive: boolean | null;
  }) => {
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
      isActive: promo.isActive ?? true,
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

  const getStatusColor = (promo: { isActive: boolean | null; validUntil?: string | Date | null; maxUses?: number | null; currentUses?: number | null }) => {
    if (!promo.isActive) return "bg-secondary text-secondary-foreground";
    const now = new Date();
    if (promo.validUntil) {
      const validUntil = new Date(promo.validUntil);
      if (validUntil < now) return "status-cancelled";
    }
    if (promo.maxUses && promo.currentUses && promo.currentUses >= promo.maxUses)
      return "bg-warning/20 text-warning";
    return "status-confirmed";
  };

  const getStatusLabel = (promo: { isActive: boolean | null; validUntil?: string | Date | null; maxUses?: number | null; currentUses?: number | null }) => {
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
      <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-6">
        <p className="text-destructive">Error loading promo codes: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header: Catalog Title + Tabs + Create Code */}
      <header className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-foreground">Catalog</h1>
          <div className="flex items-center gap-3">
            {saveSuccess && (
              <div className="flex items-center gap-2 text-success bg-success/10 px-4 py-2 rounded-lg">
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
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Create Code
            </button>
          </div>
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
          <Link
            href={`/org/${slug}/services` as Route}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 border-transparent text-muted-foreground hover:text-foreground hover:border-border transition-colors -mb-px"
          >
            <Briefcase className="h-4 w-4" />
            Services
          </Link>
          <button className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 border-primary text-foreground -mb-px">
            <Tag className="h-4 w-4" />
            Pricing
          </button>
          <Link
            href={`/org/${slug}/availability` as Route}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 border-transparent text-muted-foreground hover:text-foreground hover:border-border transition-colors -mb-px"
          >
            <CalendarClock className="h-4 w-4" />
            Schedules
          </Link>
        </nav>
      </header>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Tag className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Codes</p>
                <p className="text-xl font-semibold text-foreground">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success/10 rounded-lg">
                <CheckCircle className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-xl font-semibold text-foreground">{stats.active}</p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Uses</p>
                <p className="text-xl font-semibold text-foreground">{stats.totalUses}</p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-warning/10 rounded-lg">
                <DollarSign className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Discount</p>
                <p className="text-xl font-semibold text-foreground">
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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by code or description..."
            className="w-full pl-10 pr-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
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
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground hover:bg-accent"
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-lg border border-border bg-card p-12">
          <div className="flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        </div>
      ) : data?.data.length === 0 ? (
        <div className="rounded-lg border border-border bg-card">
          <div className="p-12 text-center">
            <Tag className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium text-foreground">No promo codes yet</h3>
            <p className="mt-2 text-muted-foreground">
              Create promo codes to offer discounts to your customers.
            </p>
            <button
              onClick={() => {
                resetForm();
                setEditingId(null);
                setShowModal(true);
              }}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Create Code
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Discount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Valid Dates
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Usage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {data?.data.map((promo) => (
                  <tr key={promo.id} className="hover:bg-muted">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div>
                          <div className="text-sm font-mono font-semibold text-foreground">
                            {promo.code}
                          </div>
                          {promo.description && (
                            <div className="text-xs text-muted-foreground">{promo.description}</div>
                          )}
                        </div>
                        <button
                          onClick={() => copyToClipboard(promo.code)}
                          className="p-1 text-muted-foreground hover:text-foreground"
                          title="Copy code"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium status-confirmed">
                        {promo.discountValue}
                        {promo.discountType === "percentage" ? "%" : " USD"} off
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      <div className="flex flex-col">
                        {promo.validFrom && <span>{formatDate(promo.validFrom)}</span>}
                        {promo.validUntil && (
                          <span className="text-xs text-muted-foreground">
                            to {formatDate(promo.validUntil)}
                          </span>
                        )}
                        {!promo.validFrom && !promo.validUntil && <span>No expiry</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
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
                          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => handleEdit(promo)}
                          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(promo.id)}
                          className="p-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 rounded"
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
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, data.total)} of{" "}
                {data.total} promo codes
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-sm rounded-lg border border-input disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                  disabled={page >= data.totalPages}
                  className="px-3 py-1.5 text-sm rounded-lg border border-input disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted"
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
          <div className="bg-card rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">
                {editingId ? "Edit Promo Code" : "Create Promo Code"}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingId(null);
                  resetForm();
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
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
                    className="flex-1 px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary font-mono"
                  />
                  <button
                    type="button"
                    onClick={generateCode}
                    className="inline-flex items-center gap-2 px-4 py-2 border border-input rounded-lg text-foreground hover:bg-muted"
                  >
                    <Sparkles className="h-4 w-4" />
                    Generate
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Brief description of this promo"
                  className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
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
                    className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  >
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed Amount</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
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
                      className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {form.discountType === "percentage" ? "%" : "$"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Valid From *
                  </label>
                  <input
                    type="date"
                    value={form.validFrom}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, validFrom: e.target.value }))
                    }
                    required
                    className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Valid Until *
                  </label>
                  <input
                    type="date"
                    value={form.validUntil}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, validUntil: e.target.value }))
                    }
                    required
                    className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
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
                    className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
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
                    className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Min Booking Amount
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
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
                    className="w-full pl-8 pr-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
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
                  className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="all">All Tours</option>
                  <option value="specific">Specific Tours</option>
                </select>
              </div>

              {form.appliesTo === "specific" && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Select Tours *
                  </label>
                  <div className="border border-input rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
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
                          className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                        />
                        <span className="text-sm text-foreground">{tour.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="flex items-center gap-3 p-3 bg-muted rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, isActive: e.target.checked }))
                    }
                    className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-foreground">Active</span>
                </label>
              </div>

              <div className="flex gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingId(null);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2 border border-input rounded-lg text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
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
