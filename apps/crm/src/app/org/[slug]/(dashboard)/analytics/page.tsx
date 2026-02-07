"use client";

import { trpc } from "@/lib/trpc";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useState, useMemo, useCallback } from "react";
import { subDays, startOfDay, endOfDay, format } from "date-fns";
import {
  DollarSign,
  CalendarDays,
  TrendingUp,
  TrendingDown,
  Users,
  UserCircle,
  Download,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Star,
  BarChart3,
  UserPlus,
  Repeat,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

// Import existing components
import { CapacityHeatmap } from "@/components/availability/capacity-heatmap";
import { GoalCard } from "@/components/goals/goal-card";
import { SimpleChart } from "@/components/dashboard/SimpleChart";

type DateRange = "7d" | "30d" | "90d" | "365d";

function getDateRange(range: DateRange): { from: Date; to: Date } {
  const to = endOfDay(new Date());
  const days = range === "7d" ? 7 : range === "30d" ? 30 : range === "90d" ? 90 : 365;
  const from = startOfDay(subDays(new Date(), days));
  return { from, to };
}

// Calculate comparison data for any metric
function calculateTrend(current: number, previous: number): { change: number; trend: "up" | "down" | "neutral" } {
  if (previous === 0) {
    return { change: current > 0 ? 100 : 0, trend: current > 0 ? "up" : "neutral" };
  }
  const change = ((current - previous) / previous) * 100;
  return {
    change: Math.round(change * 10) / 10,
    trend: change > 0 ? "up" : change < 0 ? "down" : "neutral",
  };
}

export default function AnalyticsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const slug = params.slug as string;

  const initialTab = searchParams.get("tab") || "revenue";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [dateRange, setDateRange] = useState<DateRange>("30d");

  const { from, to } = useMemo(() => getDateRange(dateRange), [dateRange]);
  const dayCount = dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : dateRange === "90d" ? 90 : 365;

  // Previous period for comparison
  const { from: prevFrom, to: prevTo } = useMemo(() => {
    const duration = to.getTime() - from.getTime();
    return {
      from: new Date(from.getTime() - duration),
      to: new Date(to.getTime() - duration),
    };
  }, [from, to]);

  // Current period booking stats
  const { data: bookingStats } = trpc.booking.getStats.useQuery({
    dateRange: { from, to },
  });

  // Previous period booking stats for comparison
  const { data: prevBookingStats } = trpc.booking.getStats.useQuery({
    dateRange: { from: prevFrom, to: prevTo },
  });

  // Revenue stats with comparison
  const { data: revenueStats } = trpc.analytics.getRevenueStats.useQuery({
    dateRange: { from, to },
  });

  // Revenue data for chart
  const { data: revenueData } = trpc.analytics.getRevenueByPeriod.useQuery({
    period: "day",
    count: dayCount,
  });

  // Booking trends for chart
  const { data: bookingTrends } = trpc.analytics.getBookingTrends.useQuery({
    period: "day",
    count: dayCount,
  });

  // Customer stats
  const { data: customerStats } = trpc.customer.getStats.useQuery();

  // Customer intelligence
  const { data: segmentDistribution } = trpc.customer.getSegmentDistribution.useQuery();
  const { data: topCustomers } = trpc.customer.getTopCustomersByCLV.useQuery({ limit: 5 });
  const { data: clvBySource } = trpc.customer.getCLVBySource.useQuery();

  // Guide stats
  const { data: guideStats } = trpc.guide.getStats.useQuery();
  const { data: guidesList } = trpc.guide.list.useQuery({ pagination: { limit: 100 } });

  // Calculate real trends
  const revenueTrend = useMemo(() => {
    if (!bookingStats || !prevBookingStats) return { change: 0, trend: "neutral" as const };
    const current = parseFloat(bookingStats.revenue || "0");
    const previous = parseFloat(prevBookingStats.revenue || "0");
    return calculateTrend(current, previous);
  }, [bookingStats, prevBookingStats]);

  const bookingsTrend = useMemo(() => {
    if (!bookingStats || !prevBookingStats) return { change: 0, trend: "neutral" as const };
    return calculateTrend(bookingStats.total, prevBookingStats.total);
  }, [bookingStats, prevBookingStats]);

  const guestsTrend = useMemo(() => {
    if (!bookingStats || !prevBookingStats) return { change: 0, trend: "neutral" as const };
    return calculateTrend(bookingStats.participantCount, prevBookingStats.participantCount);
  }, [bookingStats, prevBookingStats]);

  const avgBookingTrend = useMemo(() => {
    if (!bookingStats || !prevBookingStats) return { change: 0, trend: "neutral" as const };
    const current = parseFloat(bookingStats.averageBookingValue || "0");
    const previous = parseFloat(prevBookingStats.averageBookingValue || "0");
    return calculateTrend(current, previous);
  }, [bookingStats, prevBookingStats]);

  // Update URL when tab changes
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    const newSearchParams = new URLSearchParams(searchParams.toString());
    newSearchParams.set("tab", tab);
    router.replace(`?${newSearchParams.toString()}`);
  };

  // Export functionality
  const handleExport = useCallback(() => {
    const exportData: Record<string, unknown>[] = [];
    const filename = `analytics-${activeTab}-${format(from, "yyyy-MM-dd")}-to-${format(to, "yyyy-MM-dd")}.csv`;

    if (activeTab === "revenue" && revenueData) {
      revenueData.forEach((d) => {
        exportData.push({
          Date: d.period,
          Revenue: d.revenue,
          Bookings: d.bookingCount,
          Participants: d.participantCount,
        });
      });
    } else if (activeTab === "bookings" && bookingTrends) {
      bookingTrends.forEach((d) => {
        exportData.push({
          Date: d.period,
          Bookings: d.bookings,
          Participants: d.participants,
          Cancelled: d.cancelled,
          Completed: d.completed,
        });
      });
    } else if (activeTab === "customers" && customerStats) {
      exportData.push({
        "Total Customers": customerStats.total,
        "New This Month": customerStats.thisMonth,
        ...customerStats.bySource,
      });
    } else if (activeTab === "guides" && guideStats) {
      exportData.push({
        "Total Guides": guideStats.total,
        "Active": guideStats.active,
        "Inactive": guideStats.inactive,
        "On Leave": guideStats.onLeave,
      });
    }

    if (exportData.length === 0) return;

    // Convert to CSV
    const firstRow = exportData[0];
    if (!firstRow) return;
    const headers = Object.keys(firstRow);
    const csvContent = [
      headers.join(","),
      ...exportData.map((row) => headers.map((h) => `"${row[h] ?? ""}"`).join(",")),
    ].join("\n");

    // Download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  }, [activeTab, from, to, revenueData, bookingTrends, customerStats, guideStats]);

  // Format currency
  const formatCurrency = (value: string | number) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  // Format percentage with sign
  const formatChange = (change: number) => {
    const sign = change > 0 ? "+" : "";
    return `${sign}${change.toFixed(1)}%`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Insights</h1>
          <p className="text-muted-foreground">
            Learn from your data and improve operations
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Date Range Selector */}
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="365d">Last year</SelectItem>
            </SelectContent>
          </Select>

          {/* Export */}
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Revenue"
          value={formatCurrency(bookingStats?.revenue || 0)}
          icon={DollarSign}
          trend={revenueTrend.trend}
          change={formatChange(revenueTrend.change)}
          sparklineData={revenueData?.slice(-7).map((d) => parseFloat(d.revenue || "0"))}
          primary
        />
        <StatCard
          label="Bookings"
          value={bookingStats?.total?.toString() || "0"}
          icon={CalendarDays}
          trend={bookingsTrend.trend}
          change={formatChange(bookingsTrend.change)}
          sparklineData={bookingTrends?.slice(-7).map((d) => d.bookings)}
        />
        <StatCard
          label="Guests"
          value={bookingStats?.participantCount?.toString() || "0"}
          icon={Users}
          trend={guestsTrend.trend}
          change={formatChange(guestsTrend.change)}
          sparklineData={bookingTrends?.slice(-7).map((d) => d.participants)}
        />
        <StatCard
          label="Avg Booking"
          value={formatCurrency(bookingStats?.averageBookingValue || 0)}
          icon={TrendingUp}
          trend={avgBookingTrend.trend}
          change={formatChange(avgBookingTrend.change)}
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="revenue" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">Revenue</span>
          </TabsTrigger>
          <TabsTrigger value="bookings" className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            <span className="hidden sm:inline">Bookings</span>
          </TabsTrigger>
          <TabsTrigger value="capacity" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Utilization</span>
          </TabsTrigger>
          <TabsTrigger value="customers" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Customers</span>
          </TabsTrigger>
          <TabsTrigger value="guides" className="flex items-center gap-2">
            <UserCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Guides</span>
          </TabsTrigger>
          <TabsTrigger value="goals" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">Goals</span>
          </TabsTrigger>
        </TabsList>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="space-y-6 mt-6 animate-in fade-in-0 slide-in-from-bottom-1 duration-200">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <SimpleChart
                data={(revenueData || []).map((d) => ({
                  date: d.period,
                  value: parseFloat(d.revenue || "0"),
                }))}
                title="Revenue Trend"
                type="line"
              />
            </div>
            <div className="space-y-4">
              <div className="rounded-lg border bg-card p-4">
                <p className="text-sm text-muted-foreground">Gross Revenue</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(bookingStats?.revenue || 0)}
                </p>
              </div>
              <div className="rounded-lg border bg-card p-4">
                <p className="text-sm text-muted-foreground">Refunds</p>
                <p className="text-2xl font-bold">$0</p>
              </div>
              <div className="rounded-lg border bg-card p-4">
                <p className="text-sm text-muted-foreground">Net Revenue</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(bookingStats?.revenue || 0)}
                </p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Bookings Tab */}
        <TabsContent value="bookings" className="space-y-6 mt-6 animate-in fade-in-0 slide-in-from-bottom-1 duration-200">
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border bg-card p-4">
              <p className="text-sm text-muted-foreground">Total Bookings</p>
              <p className="text-2xl font-bold">{bookingStats?.total || 0}</p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold">{bookingStats?.pending || 0}</p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-sm text-muted-foreground">Confirmed</p>
              <p className="text-2xl font-bold">{bookingStats?.confirmed || 0}</p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-sm text-muted-foreground">Cancelled</p>
              <p className="text-2xl font-bold">{bookingStats?.cancelled || 0}</p>
            </div>
          </div>

          <SimpleChart
            data={(bookingTrends || []).map((d) => ({
              date: d.period,
              value: d.bookings,
            }))}
            title="Bookings Over Time"
            type="bar"
          />
        </TabsContent>

        {/* Utilization Tab */}
        <TabsContent value="capacity" className="space-y-6 mt-6 animate-in fade-in-0 slide-in-from-bottom-1 duration-200">
          <div className="text-sm text-muted-foreground mb-4">
            Analyze capacity utilization patterns to optimize scheduling and pricing.
          </div>
          <CapacityHeatmap orgSlug={slug} />
        </TabsContent>

        {/* Customers Tab */}
        <TabsContent value="customers" className="space-y-6 mt-6 animate-in fade-in-0 slide-in-from-bottom-1 duration-200">
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Total Customers</p>
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold mt-1">{customerStats?.total?.toLocaleString() || "0"}</p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">New This Month</p>
                <UserPlus className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold mt-1">{customerStats?.thisMonth?.toLocaleString() || "0"}</p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Repeat Rate</p>
                <Repeat className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold mt-1">
                {segmentDistribution
                  ? (() => {
                    const total = Object.values(segmentDistribution).reduce((sum, val) => sum + val, 0);
                    const repeatCustomers = (segmentDistribution.vip || 0) + (segmentDistribution.loyal || 0);
                    return `${((repeatCustomers / Math.max(1, total)) * 100).toFixed(1)}%`;
                  })()
                  : "0%"}
              </p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Avg CLV</p>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold mt-1">
                {topCustomers && topCustomers.length > 0
                  ? formatCurrency(topCustomers.reduce((sum, c) => sum + parseFloat(c.historicalCLV || "0"), 0) / topCustomers.length)
                  : "$0"}
              </p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Customer Segments */}
            <div className="rounded-lg border bg-card p-6">
              <h3 className="text-lg font-semibold mb-4">Customer Segments</h3>
              {segmentDistribution ? (
                <div className="space-y-4">
                  {[
                    { label: "VIP", value: segmentDistribution.vip || 0, color: "bg-primary" },
                    { label: "Loyal", value: segmentDistribution.loyal || 0, color: "bg-success" },
                    { label: "Promising", value: segmentDistribution.promising || 0, color: "bg-info" },
                    { label: "At Risk", value: segmentDistribution.at_risk || 0, color: "bg-warning" },
                    { label: "Dormant", value: segmentDistribution.dormant || 0, color: "bg-muted-foreground/60" },
                  ].map((segment) => {
                    const total = Object.values(segmentDistribution).reduce((sum, val) => sum + val, 0) || 1;
                    const percentage = (segment.value / total) * 100;
                    return (
                      <div key={segment.label}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-foreground">{segment.label}</span>
                          <span className="text-muted-foreground">{segment.value} ({percentage.toFixed(1)}%)</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn("h-full rounded-full transition-all", segment.color)}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                  No customer data available
                </div>
              )}
            </div>

            {/* Top Customers by CLV */}
            <div className="rounded-lg border bg-card p-6">
              <h3 className="text-lg font-semibold mb-4">Top Customers by Lifetime Value</h3>
              {topCustomers && topCustomers.length > 0 ? (
                <div className="space-y-3">
                  {topCustomers.map((customer, index) => (
                    <div key={customer.customerId} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                          {index + 1}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">Customer #{customer.customerId.slice(-6)}</p>
                          <p className="text-xs text-muted-foreground">{customer.totalBookings} bookings</p>
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-foreground">{formatCurrency(customer.historicalCLV || "0")}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                  No customer data available
                </div>
              )}
            </div>
          </div>

          {/* CLV by Source */}
          {clvBySource && Object.keys(clvBySource).length > 0 && (
            <div className="rounded-lg border bg-card p-6">
              <h3 className="text-lg font-semibold mb-4">Customer Value by Source</h3>
              <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                {Object.entries(clvBySource).map(([source, data]) => (
                  <div key={source} className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{source || "Unknown"}</p>
                    <p className="text-lg font-semibold">{formatCurrency(data.averageCLV)}</p>
                    <p className="text-xs text-muted-foreground">{data.customerCount} customers</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Guides Tab */}
        <TabsContent value="guides" className="space-y-6 mt-6 animate-in fade-in-0 slide-in-from-bottom-1 duration-200">
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Active Guides</p>
                <UserCircle className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold mt-1">{guideStats?.active || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {guideStats?.total || 0} total guides
              </p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">On Leave</p>
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold mt-1">{guideStats?.onLeave || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {guideStats?.inactive || 0} inactive
              </p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Public Profiles</p>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold mt-1">{guideStats?.public || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">
                visible on website
              </p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Avg Rating</p>
                <Star className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold mt-1">—</p>
              <p className="text-xs text-muted-foreground mt-1">
                no ratings yet
              </p>
            </div>
          </div>

          {/* Guide List */}
          <div className="rounded-lg border bg-card p-6">
            <h3 className="text-lg font-semibold mb-4">Guide Roster</h3>
            {guidesList && guidesList.data.length > 0 ? (
              <div className="space-y-3">
                {guidesList.data.slice(0, 10).map((guide) => (
                  <div key={guide.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        {guide.avatarUrl ? (
                          <img src={guide.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <span className="text-sm font-medium text-primary">
                            {guide.firstName?.[0]}{guide.lastName?.[0]}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{guide.firstName} {guide.lastName}</p>
                        <p className="text-xs text-muted-foreground">
                          {guide.languages?.join(", ") || "No languages set"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span
                        className={cn(
                          "px-2 py-0.5 text-xs font-medium rounded-full",
                          guide.status === "active" && "bg-success/10 text-success",
                          guide.status === "inactive" && "bg-muted/60 text-muted-foreground",
                          guide.status === "on_leave" && "bg-warning/10 text-warning"
                        )}
                      >
                        {guide.status}
                      </span>
                      {guide.isPublic && (
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-info/10 text-info">
                          Public
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {guidesList.total > 10 && (
                  <p className="text-xs text-muted-foreground text-center pt-2">
                    And {guidesList.total - 10} more guides...
                  </p>
                )}
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <UserCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No guides added yet</p>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Goals Tab */}
        <TabsContent value="goals" className="space-y-6 mt-6 animate-in fade-in-0 slide-in-from-bottom-1 duration-200">
          <GoalCard orgSlug={slug} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Sparkline Component
function Sparkline({ data, trend }: { data: number[]; trend: "up" | "down" | "neutral" }) {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const height = 24;
  const width = 60;
  // Add padding so line doesn't touch edges
  const paddingY = 3;
  const drawableHeight = height - paddingY * 2;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const normalizedY = (value - min) / range;
    const y = paddingY + (1 - normalizedY) * drawableHeight;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        fill="none"
        stroke={
          trend === "up"
            ? "hsl(var(--success))"
            : trend === "down"
              ? "hsl(var(--destructive))"
              : "hsl(var(--muted-foreground))"
        }
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

// Stat Card Component
interface StatCardProps {
  label: string;
  value: string;
  icon: React.ElementType;
  trend: "up" | "down" | "neutral";
  change: string;
  sparklineData?: number[];
  primary?: boolean;
}

function StatCard({ label, value, icon: Icon, trend, change, sparklineData, primary }: StatCardProps) {
  return (
    <div className={cn(
      "rounded-lg border p-4 transition-all",
      primary
        ? "bg-card border-border"
        : "bg-card border-border"
    )}>
      <div className="flex items-center justify-between">
        <p className={cn(
          "text-sm",
          primary ? "font-semibold text-success" : "text-muted-foreground"
        )}>{label}</p>
        <Icon className={cn(
          "h-4 w-4",
          primary ? "text-success" : "text-muted-foreground"
        )} />
      </div>
      <div className="flex items-end justify-between mt-1">
        <p className={cn(
          "font-bold tabular-nums text-foreground",
          primary ? "text-3xl" : "text-2xl"
        )}>{value}</p>
        {sparklineData && sparklineData.length > 1 && (
          <Sparkline data={sparklineData} trend={trend} />
        )}
      </div>
      <div className="flex items-center gap-1 mt-1">
        {trend === "up" && <ArrowUpRight className="h-3 w-3 text-success" />}
        {trend === "down" && <ArrowDownRight className="h-3 w-3 text-destructive" />}
        {trend === "neutral" && <Minus className="h-3 w-3 text-muted-foreground" />}
        <p
          className={cn(
            "text-xs",
            trend === "up" && "text-success",
            trend === "down" && "text-destructive",
            trend === "neutral" && "text-muted-foreground"
          )}
        >
          {change} vs last period
        </p>
      </div>
    </div>
  );
}
