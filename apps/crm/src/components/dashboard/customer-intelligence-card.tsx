"use client";

import { trpc } from "@/lib/trpc";
import {
  Users,
  Crown,
  AlertTriangle,
  TrendingUp,
  ChevronRight,
  UserCheck,
  UserX,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface CustomerIntelligenceCardProps {
  orgSlug: string;
}

const SEGMENT_COLORS = {
  vip: { bg: "bg-amber-500", text: "text-amber-600", light: "bg-amber-500/10" },
  loyal: { bg: "bg-emerald-500", text: "text-emerald-600", light: "bg-emerald-500/10" },
  promising: { bg: "bg-blue-500", text: "text-blue-600", light: "bg-blue-500/10" },
  at_risk: { bg: "bg-orange-500", text: "text-orange-600", light: "bg-orange-500/10" },
  dormant: { bg: "bg-gray-400", text: "text-gray-500", light: "bg-gray-500/10" },
} as const;

const SEGMENT_LABELS = {
  vip: "VIP",
  loyal: "Loyal",
  promising: "Promising",
  at_risk: "At Risk",
  dormant: "Dormant",
} as const;

export function CustomerIntelligenceCard({ orgSlug }: CustomerIntelligenceCardProps) {
  const {
    data: segmentDistribution,
    isLoading: segmentsLoading,
    refetch: refetchSegments,
  } = trpc.customer.getSegmentDistribution.useQuery();

  const { data: atRiskCustomers, isLoading: atRiskLoading } =
    trpc.customer.getAtRiskCustomers.useQuery();

  const { data: topCustomers, isLoading: topLoading } =
    trpc.customer.getTopCustomersByCLV.useQuery({ limit: 5 });

  const { data: reengagementCandidates, isLoading: reengagementLoading } =
    trpc.customer.getReengagementCandidates.useQuery();

  const isLoading = segmentsLoading || atRiskLoading || topLoading || reengagementLoading;

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl border border-border p-6 animate-pulse">
        <div className="h-6 bg-muted rounded w-48 mb-4" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-32 bg-muted rounded" />
          <div className="h-32 bg-muted rounded" />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="h-24 bg-muted rounded" />
          <div className="h-24 bg-muted rounded" />
        </div>
      </div>
    );
  }

  const totalCustomers = segmentDistribution
    ? Object.values(segmentDistribution).reduce((a, b) => a + b, 0)
    : 0;

  // Calculate percentages for donut chart
  const segments = segmentDistribution
    ? (Object.entries(segmentDistribution) as [keyof typeof SEGMENT_COLORS, number][])
        .filter(([, count]) => count > 0)
        .map(([segment, count]) => ({
          segment,
          count,
          percentage: totalCustomers > 0 ? (count / totalCustomers) * 100 : 0,
        }))
    : [];

  // Calculate stroke dash for donut chart
  const circumference = 2 * Math.PI * 40; // radius = 40
  let cumulativeOffset = 0;

  return (
    <div className="card-opportunity rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-700 dark:text-purple-400" />
          <h3 className="text-lg font-semibold text-foreground">Customer Intelligence</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetchSegments()}
          className="h-8 w-8 p-0"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Segment Distribution - Donut Chart */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">
              Segment Distribution
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Donut Chart */}
            <div className="relative w-24 h-24 shrink-0">
              <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                {segments.map(({ segment, percentage }, idx) => {
                  const strokeDasharray = (percentage / 100) * circumference;
                  const strokeDashoffset = -cumulativeOffset;
                  cumulativeOffset += strokeDasharray;

                  return (
                    <circle
                      key={segment}
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      strokeWidth="12"
                      className={SEGMENT_COLORS[segment].bg}
                      strokeDasharray={`${strokeDasharray} ${circumference}`}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                    />
                  );
                })}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold text-foreground">{totalCustomers}</span>
                <span className="text-[10px] text-muted-foreground">total</span>
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-col gap-1.5 text-xs">
              {segments.map(({ segment, count }) => (
                <div key={segment} className="flex items-center gap-2">
                  <div className={cn("w-2.5 h-2.5 rounded-full", SEGMENT_COLORS[segment].bg)} />
                  <span className="text-muted-foreground">
                    {SEGMENT_LABELS[segment]}: <span className="font-medium text-foreground">{count}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* At-Risk Customers */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-medium text-muted-foreground">
                At-Risk Customers
              </span>
            </div>
            {atRiskCustomers && atRiskCustomers.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600 font-medium">
                {atRiskCustomers.length}
              </span>
            )}
          </div>

          {atRiskCustomers && atRiskCustomers.length > 0 ? (
            <div className="space-y-2">
              {atRiskCustomers.slice(0, 3).map((customer) => (
                <Link
                  key={customer.customerId}
                  href={`/org/${orgSlug}/customers/${customer.customerId}` as Route}
                  className="flex items-center justify-between p-2 rounded-lg bg-background/50 hover:bg-background transition-colors border border-transparent hover:border-orange-500/20"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-orange-500/10 flex items-center justify-center">
                      <UserX className="h-3.5 w-3.5 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {customer.firstName} {customer.lastName.charAt(0)}.
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {customer.daysSinceLastBooking} days inactive
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              ))}
              {atRiskCustomers.length > 3 && (
                <Link
                  href={`/org/${orgSlug}/customers?segment=at_risk` as Route}
                  className="block text-xs text-center text-primary hover:underline pt-1"
                >
                  View all {atRiskCustomers.length} at-risk customers
                </Link>
              )}
            </div>
          ) : (
            <div className="text-center py-4 text-sm text-muted-foreground">
              No at-risk customers
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t border-border">
        {/* VIP Spotlight */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Crown className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-medium text-muted-foreground">
              VIP Spotlight (Top CLV)
            </span>
          </div>

          {topCustomers && topCustomers.length > 0 ? (
            <div className="space-y-2">
              {topCustomers.slice(0, 3).map((customer, idx) => (
                <Link
                  key={customer.customerId}
                  href={`/org/${orgSlug}/customers/${customer.customerId}` as Route}
                  className="flex items-center justify-between p-2 rounded-lg bg-background/50 hover:bg-background transition-colors border border-transparent hover:border-amber-500/20"
                >
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold",
                      idx === 0 && "bg-amber-500 text-white",
                      idx === 1 && "bg-gray-300 text-gray-700",
                      idx === 2 && "bg-amber-700 text-amber-100",
                      idx > 2 && "bg-muted text-muted-foreground"
                    )}>
                      {idx + 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Customer #{customer.customerId.slice(-6)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {customer.totalBookings} bookings
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-emerald-600">
                      ${parseFloat(customer.historicalCLV).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </p>
                    <p className="text-[10px] text-muted-foreground">lifetime</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-sm text-muted-foreground">
              No customer data yet
            </div>
          )}
        </div>

        {/* Re-engagement Opportunity */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium text-muted-foreground">
                Re-engagement
              </span>
            </div>
          </div>

          {reengagementCandidates && reengagementCandidates.length > 0 ? (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-info-subtle border border-info-subtle">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      {reengagementCandidates.length}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      customers need attention
                    </p>
                  </div>
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/40">
                    <UserCheck className="h-5 w-5 text-blue-700 dark:text-blue-400" />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <div>
                  <span className="text-muted-foreground">At risk (60+ days): </span>
                  <span className="font-medium text-orange-600">
                    {reengagementCandidates.filter((c) => c.triggerType === "at_risk_60_days").length}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Dormant (120+ days): </span>
                  <span className="font-medium text-gray-500">
                    {reengagementCandidates.filter((c) => c.triggerType === "dormant_120_days").length}
                  </span>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                asChild
              >
                <Link href={`/org/${orgSlug}/communications?tab=campaigns` as Route}>
                  Send Re-engagement Campaign
                </Link>
              </Button>
            </div>
          ) : (
            <div className="text-center py-4">
              <UserCheck className="h-6 w-6 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                All customers are engaged
              </p>
            </div>
          )}
        </div>
      </div>

      {/* View All Link */}
      <div className="mt-6 pt-4 border-t border-border flex justify-center">
        <Link
          href={`/org/${orgSlug}/reports/customers` as Route}
          className="text-sm text-primary hover:underline inline-flex items-center gap-1"
        >
          View Full Customer Report
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
