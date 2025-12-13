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

export default function PromoCodeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const id = params.id as string;
  const [copySuccess, setCopySuccess] = useState(false);

  const { data: promo, isLoading, error } = trpc.promoCode.getById.useQuery({ id });
  const { data: stats } = trpc.promoCode.getUsageStats.useQuery({ id });

  const utils = trpc.useUtils();

  const deleteMutation = trpc.promoCode.delete.useMutation({
    onSuccess: () => {
      router.push(`/org/${slug}/promo-codes`);
    },
  });

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this promo code?")) {
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
      <div className="space-y-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6">
          <p className="text-red-600">Error loading promo code: {error.message}</p>
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
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <p className="text-gray-600">Promo code not found</p>
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
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 font-mono">{promo.code}</h1>
              <button
                onClick={() => copyToClipboard(promo.code)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                title="Copy code"
              >
                <Copy className="h-4 w-4" />
              </button>
              {copySuccess && (
                <span className="text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle className="h-3.5 w-3.5" />
                  Copied!
                </span>
              )}
            </div>
            {promo.description && (
              <p className="text-gray-500 mt-1">{promo.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/org/${slug}/promo-codes?edit=${id}` as Route}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            <Edit className="h-4 w-4" />
            Edit
          </Link>
          <button
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      </div>

      {/* Code Info Card */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <Percent className="h-4 w-4" />
              Discount
            </div>
            <p className="text-lg font-semibold text-gray-900">
              {promo.discountValue}
              {promo.discountType === "percentage" ? "%" : " USD"} off
            </p>
          </div>

          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <Calendar className="h-4 w-4" />
              Valid Period
            </div>
            {promo.validFrom && promo.validUntil ? (
              <>
                <p className="text-sm font-medium text-gray-900">
                  {formatDate(promo.validFrom)}
                </p>
                <p className="text-xs text-gray-500">to {formatDate(promo.validUntil)}</p>
              </>
            ) : (
              <p className="text-sm font-medium text-gray-900">No expiry</p>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <Users className="h-4 w-4" />
              Usage Limit
            </div>
            <p className="text-lg font-semibold text-gray-900">
              {promo.maxUses || "Unlimited"}
            </p>
            {promo.maxUsesPerCustomer && (
              <p className="text-xs text-gray-500">
                {promo.maxUsesPerCustomer} per customer
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <DollarSign className="h-4 w-4" />
              Min Amount
            </div>
            <p className="text-lg font-semibold text-gray-900">
              {promo.minBookingAmount
                ? `$${parseFloat(promo.minBookingAmount).toFixed(2)}`
                : "No minimum"}
            </p>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                promo
              )}`}
            >
              {getStatusLabel(promo)}
            </span>
            {promo.appliesTo === "all" ? (
              <span className="text-sm text-gray-500">Applies to all tours</span>
            ) : (
              <span className="text-sm text-gray-500">
                Applies to {promo.tourIds?.length || 0} specific tours
              </span>
            )}
          </div>
          <div className="text-sm text-gray-500">
            Created {formatDate(promo.createdAt)}
          </div>
        </div>
      </div>

      {/* Usage Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Uses</p>
                <p className="text-xl font-semibold text-gray-900">{stats.totalUses}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Discount</p>
                <p className="text-xl font-semibold text-gray-900">
                  ${stats.totalDiscount.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Avg Discount</p>
                <p className="text-xl font-semibold text-gray-900">
                  ${stats.averageDiscount.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Users className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Unique Customers</p>
                <p className="text-xl font-semibold text-gray-900">
                  {stats.uniqueCustomers}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Usage History - Placeholder for future implementation */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Usage History</h2>
          <p className="text-sm text-gray-500 mt-1">
            All bookings that used this promo code
          </p>
        </div>

        <div className="p-12 text-center">
          <Tag className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">Usage tracking coming soon</h3>
          <p className="mt-2 text-gray-500">
            Detailed usage history will be available in a future update.
            <br />
            Current total uses: {promo.currentUses || 0}
          </p>
        </div>
      </div>

      {/* Warning for expired/used up codes */}
      {promo.maxUses && promo.currentUses && promo.currentUses >= promo.maxUses && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
            <div>
              <p className="font-medium text-orange-800">Usage limit reached</p>
              <p className="text-sm text-orange-700 mt-1">
                This promo code has reached its maximum usage limit and can no longer be
                used by customers.
              </p>
            </div>
          </div>
        </div>
      )}

      {promo.validUntil && new Date(promo.validUntil) < new Date() && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <div>
              <p className="font-medium text-red-800">Promo code expired</p>
              <p className="text-sm text-red-700 mt-1">
                This promo code expired on {formatDate(promo.validUntil)} and can no
                longer be used.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
