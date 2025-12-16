"use client";

import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import {
  Gift,
  Plus,
  Loader2,
  CheckCircle,
  Trash2,
  Eye,
  ArrowLeft,
  AlertCircle,
  DollarSign,
  Percent,
  Calendar,
  Search,
  Copy,
  Mail,
  X,
} from "lucide-react";
import { useConfirmModal } from "@/components/ui/confirm-modal";
import { Badge } from "@tour/ui";
import { toast } from "sonner";

type VoucherType = "monetary" | "percentage" | "tour";
type VoucherStatus = "active" | "partially_redeemed" | "redeemed" | "expired" | "cancelled";

const STATUS_STYLES: Record<VoucherStatus, string> = {
  active: "bg-success/10 text-success border-success/20",
  partially_redeemed: "bg-warning/10 text-warning border-warning/20",
  redeemed: "bg-muted text-muted-foreground border-border",
  expired: "bg-destructive/10 text-destructive border-destructive/20",
  cancelled: "bg-muted text-muted-foreground border-border",
};

const TYPE_ICONS: Record<VoucherType, typeof DollarSign> = {
  monetary: DollarSign,
  percentage: Percent,
  tour: Gift,
};

export default function VouchersSettingsPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewingVoucher, setViewingVoucher] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<VoucherStatus | "all">("all");
  const { confirm, ConfirmModal } = useConfirmModal();

  const utils = trpc.useUtils();

  const { data: vouchers, isLoading } = trpc.voucher.list.useQuery({
    filters: {
      search: searchQuery || undefined,
      status: statusFilter !== "all" ? statusFilter : undefined,
    },
    sortField: "createdAt",
    sortDirection: "desc",
  });

  const { data: stats } = trpc.voucher.getStats.useQuery();

  const { data: voucherDetails } = trpc.voucher.getById.useQuery(
    { id: viewingVoucher! },
    { enabled: !!viewingVoucher }
  );

  const initialFormData = {
    type: "monetary" as VoucherType,
    monetaryValue: "",
    percentageValue: "",
    purchaserName: "",
    purchaserEmail: "",
    recipientName: "",
    recipientEmail: "",
    personalMessage: "",
    purchaseAmount: "",
    validFrom: format(new Date(), "yyyy-MM-dd"),
    expiresAt: format(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
  };

  const [formData, setFormData] = useState(initialFormData);

  const createMutation = trpc.voucher.create.useMutation({
    onSuccess: (voucher) => {
      utils.voucher.list.invalidate();
      utils.voucher.getStats.invalidate();
      setShowCreateModal(false);
      setFormData(initialFormData);
      toast.success(`Voucher ${voucher.code} created successfully`);
    },
    onError: (error) => {
      toast.error(`Failed to create voucher: ${error.message}`);
    },
  });

  const cancelMutation = trpc.voucher.cancel.useMutation({
    onSuccess: () => {
      utils.voucher.list.invalidate();
      utils.voucher.getStats.invalidate();
      toast.success("Voucher cancelled");
    },
    onError: (error) => {
      toast.error(`Failed to cancel voucher: ${error.message}`);
    },
  });

  const handleCancel = async (id: string, code: string) => {
    const confirmed = await confirm({
      title: "Cancel Voucher",
      description: `Are you sure you want to cancel voucher ${code}? This cannot be undone.`,
      confirmLabel: "Cancel Voucher",
      variant: "destructive",
    });

    if (confirmed) {
      cancelMutation.mutate({ id });
    }
  };

  const handleCopyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    toast.success("Voucher code copied to clipboard");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    createMutation.mutate({
      type: formData.type,
      monetaryValue: formData.type === "monetary" ? formData.monetaryValue : undefined,
      percentageValue: formData.type === "percentage" ? parseInt(formData.percentageValue) : undefined,
      purchaserName: formData.purchaserName || undefined,
      purchaserEmail: formData.purchaserEmail || undefined,
      recipientName: formData.recipientName || undefined,
      recipientEmail: formData.recipientEmail || undefined,
      personalMessage: formData.personalMessage || undefined,
      purchaseAmount: formData.purchaseAmount || undefined,
      validFrom: new Date(formData.validFrom),
      expiresAt: formData.expiresAt ? new Date(formData.expiresAt) : undefined,
    });
  };

  const formatValue = (voucher: NonNullable<typeof vouchers>[number]) => {
    if (voucher.type === "monetary") {
      return `$${parseFloat(voucher.monetaryValue || "0").toFixed(2)}`;
    }
    if (voucher.type === "percentage") {
      return `${voucher.percentageValue}%`;
    }
    return "Tour Credit";
  };

  const formatRemaining = (voucher: NonNullable<typeof vouchers>[number]) => {
    if (voucher.type === "monetary" && voucher.remainingValue) {
      return `$${parseFloat(voucher.remainingValue).toFixed(2)} remaining`;
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={`/org/${slug}/settings`}
            className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gift Vouchers</h1>
            <p className="text-muted-foreground mt-1">
              Create and manage gift vouchers for your tours
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            setFormData(initialFormData);
            setShowCreateModal(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New Voucher
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Active</p>
            <p className="text-2xl font-bold text-foreground">{stats.active}</p>
          </div>
          <div className="bg-card rounded-lg border border-success/20 p-4">
            <p className="text-sm text-success">Redeemed</p>
            <p className="text-2xl font-bold text-success">{stats.redeemed}</p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Total Sold</p>
            <p className="text-2xl font-bold text-foreground">${stats.totalSold.toFixed(0)}</p>
          </div>
          <div className="bg-card rounded-lg border border-warning/20 p-4">
            <p className="text-sm text-warning">Outstanding</p>
            <p className="text-2xl font-bold text-warning">${stats.outstandingLiability.toFixed(0)}</p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Expiring Soon</p>
            <p className="text-2xl font-bold text-foreground">{stats.expiringSoon}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by code, name, or email..."
            className="w-full pl-10 pr-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as VoucherStatus | "all")}
          className="px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="partially_redeemed">Partially Redeemed</option>
          <option value="redeemed">Redeemed</option>
          <option value="expired">Expired</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Vouchers List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : vouchers && vouchers.length > 0 ? (
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Code</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Type</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Value</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Recipient</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Status</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Expires</th>
                <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {vouchers.map((voucher) => {
                const TypeIcon = TYPE_ICONS[voucher.type as VoucherType];
                const remaining = formatRemaining(voucher);
                return (
                  <tr key={voucher.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <code className="font-mono text-sm font-medium text-foreground">
                          {voucher.code}
                        </code>
                        <button
                          onClick={() => handleCopyCode(voucher.code)}
                          className="p-1 hover:bg-muted rounded"
                        >
                          <Copy className="h-3 w-3 text-muted-foreground" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <TypeIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-foreground capitalize">{voucher.type}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">{formatValue(voucher)}</p>
                        {remaining && (
                          <p className="text-xs text-muted-foreground">{remaining}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm text-foreground">{voucher.recipientName || "—"}</p>
                        {voucher.recipientEmail && (
                          <p className="text-xs text-muted-foreground">{voucher.recipientEmail}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                          STATUS_STYLES[voucher.status as VoucherStatus]
                        }`}
                      >
                        {voucher.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {voucher.expiresAt
                        ? format(new Date(voucher.expiresAt), "MMM d, yyyy")
                        : "Never"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setViewingVoucher(voucher.id)}
                          className="p-2 hover:bg-muted rounded-lg transition-colors"
                          title="View details"
                        >
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        </button>
                        {(voucher.status === "active" || voucher.status === "partially_redeemed") && (
                          <button
                            onClick={() => handleCancel(voucher.id, voucher.code)}
                            className="p-2 hover:bg-destructive/10 rounded-lg transition-colors"
                            title="Cancel voucher"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 bg-card rounded-lg border border-border">
          <Gift className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No vouchers yet</h3>
          <p className="text-muted-foreground mb-6">
            Create gift vouchers that customers can purchase or you can give as promotions.
          </p>
          <button
            onClick={() => {
              setFormData(initialFormData);
              setShowCreateModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Create First Voucher
          </button>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 m-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-foreground">Create Gift Voucher</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-muted rounded-lg"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Voucher Type */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Voucher Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["monetary", "percentage", "tour"] as VoucherType[]).map((type) => {
                    const Icon = TYPE_ICONS[type];
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, type }))}
                        className={`p-3 rounded-lg border-2 text-center transition-all ${
                          formData.type === type
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <Icon className={`h-5 w-5 mx-auto mb-1 ${
                          formData.type === type ? "text-primary" : "text-muted-foreground"
                        }`} />
                        <span className={`text-sm font-medium capitalize ${
                          formData.type === type ? "text-primary" : "text-foreground"
                        }`}>
                          {type}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Value */}
              {formData.type === "monetary" && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Voucher Value *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.monetaryValue}
                      onChange={(e) => setFormData((prev) => ({ ...prev, monetaryValue: e.target.value }))}
                      required
                      className="w-full pl-8 pr-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                      placeholder="50.00"
                    />
                  </div>
                </div>
              )}

              {formData.type === "percentage" && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Discount Percentage *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={formData.percentageValue}
                      onChange={(e) => setFormData((prev) => ({ ...prev, percentageValue: e.target.value }))}
                      required
                      className="w-full pr-8 pl-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                      placeholder="10"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                  </div>
                </div>
              )}

              {/* Purchase Amount */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Purchase Amount (optional)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.purchaseAmount}
                    onChange={(e) => setFormData((prev) => ({ ...prev, purchaseAmount: e.target.value }))}
                    className="w-full pl-8 pr-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="What did they pay?"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Track how much the purchaser paid (may differ from voucher value)
                </p>
              </div>

              {/* Purchaser Info */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Purchaser Name
                  </label>
                  <input
                    type="text"
                    value={formData.purchaserName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, purchaserName: e.target.value }))}
                    className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="Who bought it?"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Purchaser Email
                  </label>
                  <input
                    type="email"
                    value={formData.purchaserEmail}
                    onChange={(e) => setFormData((prev) => ({ ...prev, purchaserEmail: e.target.value }))}
                    className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="Email"
                  />
                </div>
              </div>

              {/* Recipient Info */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Recipient Name
                  </label>
                  <input
                    type="text"
                    value={formData.recipientName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, recipientName: e.target.value }))}
                    className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="Who is it for?"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Recipient Email
                  </label>
                  <input
                    type="email"
                    value={formData.recipientEmail}
                    onChange={(e) => setFormData((prev) => ({ ...prev, recipientEmail: e.target.value }))}
                    className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="Email to send voucher"
                  />
                </div>
              </div>

              {/* Personal Message */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Personal Message
                </label>
                <textarea
                  value={formData.personalMessage}
                  onChange={(e) => setFormData((prev) => ({ ...prev, personalMessage: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Add a gift message..."
                />
              </div>

              {/* Validity Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Valid From
                  </label>
                  <input
                    type="date"
                    value={formData.validFrom}
                    onChange={(e) => setFormData((prev) => ({ ...prev, validFrom: e.target.value }))}
                    className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Expires
                  </label>
                  <input
                    type="date"
                    value={formData.expiresAt}
                    onChange={(e) => setFormData((prev) => ({ ...prev, expiresAt: e.target.value }))}
                    className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-input rounded-lg text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
                >
                  {createMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Gift className="h-4 w-4" />
                  )}
                  Create Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {viewingVoucher && voucherDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-xl shadow-xl w-full max-w-md p-6 m-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-foreground">Voucher Details</h3>
              <button
                onClick={() => setViewingVoucher(null)}
                className="p-2 hover:bg-muted rounded-lg"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Code */}
              <div className="p-4 bg-muted rounded-lg text-center">
                <p className="text-sm text-muted-foreground mb-1">Voucher Code</p>
                <div className="flex items-center justify-center gap-2">
                  <code className="text-2xl font-mono font-bold text-foreground">
                    {voucherDetails.code}
                  </code>
                  <button
                    onClick={() => handleCopyCode(voucherDetails.code)}
                    className="p-2 hover:bg-background rounded-lg"
                  >
                    <Copy className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              </div>

              {/* Status & Value */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border mt-1 ${
                      STATUS_STYLES[voucherDetails.status as VoucherStatus]
                    }`}
                  >
                    {voucherDetails.status.replace("_", " ")}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Value</p>
                  <p className="text-lg font-semibold text-foreground">
                    {formatValue(voucherDetails)}
                  </p>
                </div>
              </div>

              {/* Remaining Value */}
              {voucherDetails.type === "monetary" && voucherDetails.remainingValue && (
                <div>
                  <p className="text-sm text-muted-foreground">Remaining</p>
                  <p className="text-lg font-semibold text-success">
                    ${parseFloat(voucherDetails.remainingValue).toFixed(2)}
                  </p>
                </div>
              )}

              {/* Purchaser */}
              {(voucherDetails.purchaserName || voucherDetails.purchaserEmail) && (
                <div>
                  <p className="text-sm text-muted-foreground">Purchaser</p>
                  <p className="font-medium text-foreground">{voucherDetails.purchaserName || "—"}</p>
                  {voucherDetails.purchaserEmail && (
                    <p className="text-sm text-muted-foreground">{voucherDetails.purchaserEmail}</p>
                  )}
                </div>
              )}

              {/* Recipient */}
              {(voucherDetails.recipientName || voucherDetails.recipientEmail) && (
                <div>
                  <p className="text-sm text-muted-foreground">Recipient</p>
                  <p className="font-medium text-foreground">{voucherDetails.recipientName || "—"}</p>
                  {voucherDetails.recipientEmail && (
                    <p className="text-sm text-muted-foreground">{voucherDetails.recipientEmail}</p>
                  )}
                </div>
              )}

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="text-sm text-foreground">
                    {format(new Date(voucherDetails.createdAt), "MMM d, yyyy")}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Expires</p>
                  <p className="text-sm text-foreground">
                    {voucherDetails.expiresAt
                      ? format(new Date(voucherDetails.expiresAt), "MMM d, yyyy")
                      : "Never"}
                  </p>
                </div>
              </div>

              {/* Redeemed Info */}
              {voucherDetails.redeemedAt && (
                <div className="pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground">Redeemed</p>
                  <p className="text-sm text-foreground">
                    {format(new Date(voucherDetails.redeemedAt), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-6">
              <button
                onClick={() => setViewingVoucher(null)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {ConfirmModal}
    </div>
  );
}
