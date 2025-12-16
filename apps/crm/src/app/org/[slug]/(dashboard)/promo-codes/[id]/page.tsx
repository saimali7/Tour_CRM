"use client";

import { trpc } from "@/lib/trpc";
import {
  Tag,
  Edit,
  Trash2,
  ArrowLeft,
  Copy,
  CheckCircle,
  Calendar,
  Users,
  DollarSign,
  TrendingUp,
  Eye,
  Percent,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useConfirmModal, ConfirmModal } from "@/components/ui/confirm-modal";

export default function PromoCodeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const id = params.id as string;
  const [copySuccess, setCopySuccess] = useState(false);
  const { confirm, ConfirmModal } = useConfirmModal();

  const { data: promo, isLoading, error } = trpc.promoCode.getById.useQuery({ id });
  const { data: stats } = trpc.promoCode.getUsageStats.useQuery({ id });

  const utils = trpc.useUtils();

  const deleteMutation = trpc.promoCode.delete.useMutation({
    onSuccess: () => {
      router.push(`/org/${slug}/promo-codes`);
    },
  });

  const handleDelete = async () => {
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
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const formatDate = (date: string | Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(date));
  };

  const formatDateTime = (date: string | Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
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
      <div className="space-y-6">
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-6">
          <p className="text-destructive">Error loading promo code: {error.message}</p>
        </div>
        <Link
          href={`/org/${slug}/promo-codes` as Route}
          className="inline-flex items-center gap-2 text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Promo Codes
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!promo) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-border bg-card p-6">
          <p className="text-muted-foreground">Promo code not found</p>
        </div>
        <Link
          href={`/org/${slug}/promo-codes` as Route}
          className="inline-flex items-center gap-2 text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Promo Codes
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={`/org/${slug}/promo-codes` as Route}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground font-mono">{promo.code}</h1>
              <button
                onClick={() => copyToClipboard(promo.code)}
                className="p-1.5 text-muted-foreground hover:text-muted-foreground hover:bg-accent rounded transition-colors"
                title="Copy code"
              >
                <Copy className="h-4 w-4" />
              </button>
              {copySuccess && (
                <span className="text-sm text-success flex items-center gap-1">
                  <CheckCircle className="h-3.5 w-3.5" />
                  Copied!
                </span>
              )}
            </div>
            {promo.description && (
              <p className="text-muted-foreground mt-1">{promo.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/org/${slug}/promo-codes?edit=${id}` as Route}
            className="inline-flex items-center gap-2 px-4 py-2 border border-input rounded-lg text-foreground hover:bg-muted"
          >
            <Edit className="h-4 w-4" />
            Edit
          </Link>
          <button
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 border border-destructive/30 text-destructive rounded-lg hover:bg-destructive/10 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      </div>

      {/* Code Info Card */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Percent className="h-4 w-4" />
              Discount
            </div>
            <p className="text-lg font-semibold text-foreground">
              {promo.discountValue}
              {promo.discountType === "percentage" ? "%" : " USD"} off
            </p>
          </div>

          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Calendar className="h-4 w-4" />
              Valid Period
            </div>
            {promo.validFrom && promo.validUntil ? (
              <>
                <p className="text-sm font-medium text-foreground">
                  {formatDate(promo.validFrom)}
                </p>
                <p className="text-xs text-muted-foreground">to {formatDate(promo.validUntil)}</p>
              </>
            ) : (
              <p className="text-sm font-medium text-foreground">No expiry</p>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Users className="h-4 w-4" />
              Usage Limit
            </div>
            <p className="text-lg font-semibold text-foreground">
              {promo.maxUses || "Unlimited"}
            </p>
            {promo.maxUsesPerCustomer && (
              <p className="text-xs text-muted-foreground">
                {promo.maxUsesPerCustomer} per customer
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
              Min Amount
            </div>
            <p className="text-lg font-semibold text-foreground">
              {promo.minBookingAmount
                ? `$${parseFloat(promo.minBookingAmount).toFixed(2)}`
                : "No minimum"}
            </p>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-border flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                promo
              )}`}
            >
              {getStatusLabel(promo)}
            </span>
            {promo.appliesTo === "all" ? (
              <span className="text-sm text-muted-foreground">Applies to all tours</span>
            ) : (
              <span className="text-sm text-muted-foreground">
                Applies to {promo.tourIds?.length || 0} specific tours
              </span>
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            Created {formatDate(promo.createdAt)}
          </div>
        </div>
      </div>

      {/* Usage Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <div className="p-2 bg-success/10 rounded-lg">
                <DollarSign className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Discount</p>
                <p className="text-xl font-semibold text-foreground">
                  ${stats.totalDiscount.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Discount</p>
                <p className="text-xl font-semibold text-foreground">
                  ${stats.averageDiscount.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-warning/10 rounded-lg">
                <Users className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Unique Customers</p>
                <p className="text-xl font-semibold text-foreground">
                  {stats.uniqueCustomers}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Usage History - Placeholder for future implementation */}
      <div className="bg-card rounded-lg border border-border">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Usage History</h2>
          <p className="text-sm text-muted-foreground mt-1">
            All bookings that used this promo code
          </p>
        </div>

        <div className="p-12 text-center">
          <Tag className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium text-foreground">Usage tracking coming soon</h3>
          <p className="mt-2 text-muted-foreground">
            Detailed usage history will be available in a future update.
            <br />
            Current total uses: {promo.currentUses || 0}
          </p>
        </div>
      </div>

      {/* Warning for expired/used up codes */}
      {promo.maxUses && promo.currentUses && promo.currentUses >= promo.maxUses && (
        <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-warning mt-0.5" />
            <div>
              <p className="font-medium text-warning">Usage limit reached</p>
              <p className="text-sm text-warning/80 mt-1">
                This promo code has reached its maximum usage limit and can no longer be
                used by customers.
              </p>
            </div>
          </div>
        </div>
      )}

      {promo.validUntil && new Date(promo.validUntil) < new Date() && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
            <div>
              <p className="font-medium text-destructive">Promo code expired</p>
              <p className="text-sm text-destructive/80 mt-1">
                This promo code expired on {formatDate(promo.validUntil)} and can no
                longer be used.
              </p>
            </div>
          </div>
        </div>
      )}

      {ConfirmModal}
    </div>
  );
}
