"use client";

import { trpc } from "@/lib/trpc";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import { subDays, startOfDay, endOfDay } from "date-fns";
import {
  DollarSign,
  CalendarDays,
  TrendingUp,
  Users,
  UserCircle,
  Download,
  Target,
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

export default function AnalyticsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const slug = params.slug as string;

  const initialTab = searchParams.get("tab") || "revenue";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [dateRange, setDateRange] = useState<DateRange>("30d");

  const { from, to } = useMemo(() => getDateRange(dateRange), [dateRange]);

  // Booking stats
  const { data: bookingStats } = trpc.booking.getStats.useQuery({
    dateRange: { from, to },
  });

  // Revenue data
  const { data: revenueData } = trpc.analytics.getRevenueByPeriod.useQuery({
    period: "day",
    count: dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : dateRange === "90d" ? 90 : 365,
  });

  // Booking trends
  const { data: bookingTrends } = trpc.analytics.getBookingTrends.useQuery({
    period: "day",
    count: dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : dateRange === "90d" ? 90 : 365,
  });

  // Update URL when tab changes
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    const newSearchParams = new URLSearchParams(searchParams.toString());
    newSearchParams.set("tab", tab);
    router.replace(`?${newSearchParams.toString()}`);
  };

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

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Analytics</h1>
          <p className="text-muted-foreground">
            Track performance and make data-driven decisions
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
          <Button variant="outline">
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
          trend="up"
          change="+12%"
        />
        <StatCard
          label="Bookings"
          value={bookingStats?.total?.toString() || "0"}
          icon={CalendarDays}
          trend="up"
          change="+8%"
        />
        <StatCard
          label="Guests"
          value={bookingStats?.participantCount?.toString() || "0"}
          icon={Users}
          trend="up"
          change="+15%"
        />
        <StatCard
          label="Avg Booking"
          value={formatCurrency(bookingStats?.averageBookingValue || 0)}
          icon={TrendingUp}
          trend="neutral"
          change="+2%"
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
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Capacity</span>
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
        <TabsContent value="revenue" className="space-y-6 mt-6">
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
        <TabsContent value="bookings" className="space-y-6 mt-6">
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

        {/* Capacity Tab */}
        <TabsContent value="capacity" className="space-y-6 mt-6">
          <CapacityHeatmap orgSlug={slug} />
        </TabsContent>

        {/* Customers Tab */}
        <TabsContent value="customers" className="space-y-6 mt-6">
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border bg-card p-4">
              <p className="text-sm text-muted-foreground">Total Customers</p>
              <p className="text-2xl font-bold">-</p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-sm text-muted-foreground">New This Period</p>
              <p className="text-2xl font-bold">-</p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-sm text-muted-foreground">Repeat Rate</p>
              <p className="text-2xl font-bold">-</p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-sm text-muted-foreground">Avg CLV</p>
              <p className="text-2xl font-bold">-</p>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-6">
            <h3 className="text-lg font-semibold mb-4">Customer Acquisition</h3>
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Customer trend chart will appear here
            </div>
          </div>
        </TabsContent>

        {/* Guides Tab */}
        <TabsContent value="guides" className="space-y-6 mt-6">
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border bg-card p-4">
              <p className="text-sm text-muted-foreground">Active Guides</p>
              <p className="text-2xl font-bold">-</p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-sm text-muted-foreground">Tours Led</p>
              <p className="text-2xl font-bold">-</p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-sm text-muted-foreground">Avg Tours/Guide</p>
              <p className="text-2xl font-bold">-</p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-sm text-muted-foreground">Avg Rating</p>
              <p className="text-2xl font-bold">-</p>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-6">
            <h3 className="text-lg font-semibold mb-4">Guide Performance</h3>
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Guide performance chart will appear here
            </div>
          </div>
        </TabsContent>

        {/* Goals Tab */}
        <TabsContent value="goals" className="space-y-6 mt-6">
          <GoalCard orgSlug={slug} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Stat Card Component
interface StatCardProps {
  label: string;
  value: string;
  icon: React.ElementType;
  trend: "up" | "down" | "neutral";
  change: string;
}

function StatCard({ label, value, icon: Icon, trend, change }: StatCardProps) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="text-2xl font-bold mt-1">{value}</p>
      <p
        className={cn(
          "text-xs mt-1",
          trend === "up" && "text-green-600",
          trend === "down" && "text-red-600",
          trend === "neutral" && "text-muted-foreground"
        )}
      >
        {change} vs last period
      </p>
    </div>
  );
}
