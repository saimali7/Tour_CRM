"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Calendar,
  Users,
  UserCheck,
  AlertCircle,
  DollarSign,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import { useParams } from "next/navigation";
import {
  StatCard,
  ActivityFeed,
  TodaySchedule,
  MetricCard,
  SimpleChart,
} from "@/components/dashboard";

type TabType = "operations" | "business";

export default function DashboardPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [activeTab, setActiveTab] = useState<TabType>("operations");

  // Fetch dashboard data
  const {
    data: operationsData,
    isLoading: operationsLoading,
    error: operationsError,
  } = trpc.dashboard.getOperationsDashboard.useQuery(undefined, {
    refetchInterval: 60000, // Auto-refresh every 60 seconds
  });

  const {
    data: businessData,
    isLoading: businessLoading,
    error: businessError,
  } = trpc.dashboard.getBusinessDashboard.useQuery({}, {
    enabled: activeTab === "business",
  });

  if (operationsError || businessError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <p className="text-red-600">
          Error loading dashboard: {operationsError?.message || businessError?.message}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Overview of your tour operations</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-8">
          <button
            onClick={() => setActiveTab("operations")}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === "operations"
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Operations Dashboard
          </button>
          <button
            onClick={() => setActiveTab("business")}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === "business"
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Business Dashboard
          </button>
        </nav>
      </div>

      {/* Operations Tab */}
      {activeTab === "operations" && (
        <>
          {operationsLoading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : operationsData ? (
            <div className="space-y-6">
              {/* Key Stats */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  title="Tours Today"
                  value={operationsData.todaysOperations.scheduledTours}
                  icon={Calendar}
                  color="blue"
                />
                <StatCard
                  title="Total Participants"
                  value={operationsData.todaysOperations.totalParticipants}
                  icon={Users}
                  color="purple"
                />
                <StatCard
                  title="Guides Working"
                  value={operationsData.todaysOperations.guidesWorking}
                  icon={UserCheck}
                  color="green"
                />
                <StatCard
                  title="Unconfirmed Guides"
                  value={operationsData.upcomingSchedules.filter(s => s.hasUnconfirmedGuide).length}
                  icon={AlertCircle}
                  color={
                    operationsData.upcomingSchedules.filter(s => s.hasUnconfirmedGuide).length > 0
                      ? "yellow"
                      : "gray"
                  }
                />
              </div>

              {/* Today's Schedule */}
              <div className="rounded-lg border border-gray-200 bg-white p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Today's Schedule
                </h2>
                <TodaySchedule
                  schedule={operationsData.upcomingSchedules.map((s) => ({
                    scheduleId: s.scheduleId,
                    time: new Date(s.startsAt).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    }),
                    tourName: s.tourName,
                    tourId: s.scheduleId,
                    bookedParticipants: s.bookedCount,
                    capacity: s.maxParticipants,
                    guide: s.guideName
                      ? {
                          id: s.scheduleId,
                          name: s.guideName,
                        }
                      : null,
                    status: s.hasUnconfirmedGuide
                      ? "issue"
                      : s.bookedCount === 0
                      ? "needs_attention"
                      : "on_track",
                    statusReason: s.hasUnconfirmedGuide
                      ? "No guide assigned"
                      : undefined,
                  }))}
                  orgSlug={slug}
                />
              </div>

              {/* Recent Activity */}
              <div className="rounded-lg border border-gray-200 bg-white p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Recent Activity
                </h2>
                <ActivityFeed
                  activities={operationsData.recentActivity.map((activity, idx) => ({
                    id: `${activity.entityType}-${activity.entityId}-${idx}`,
                    type: activity.type,
                    entityType: activity.entityType,
                    entityId: activity.entityId,
                    description: activity.description,
                    timestamp: activity.timestamp,
                    actorName: "System",
                  }))}
                  orgSlug={slug}
                />
              </div>
            </div>
          ) : null}
        </>
      )}

      {/* Business Tab */}
      {activeTab === "business" && (
        <>
          {businessLoading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : businessData ? (
            <div className="space-y-6">
              {/* Revenue Cards */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StatCard
                  title="Today's Revenue"
                  value={`$${businessData.keyMetrics.todayVsYesterday.revenue.today}`}
                  icon={DollarSign}
                  color="green"
                  trend={{
                    value: businessData.keyMetrics.todayVsYesterday.revenue.change,
                    direction:
                      businessData.keyMetrics.todayVsYesterday.revenue.change >= 0
                        ? "up"
                        : "down",
                  }}
                />
                <StatCard
                  title="This Week"
                  value={`$${businessData.keyMetrics.thisWeekVsLastWeek.revenue.thisWeek}`}
                  icon={TrendingUp}
                  color="blue"
                  trend={{
                    value: businessData.keyMetrics.thisWeekVsLastWeek.revenue.change,
                    direction:
                      businessData.keyMetrics.thisWeekVsLastWeek.revenue.change >= 0
                        ? "up"
                        : "down",
                  }}
                />
                <StatCard
                  title="Total Revenue"
                  value={`$${businessData.revenueStats.totalRevenue}`}
                  icon={BarChart3}
                  color="purple"
                />
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SimpleChart
                  data={businessData.trendData.last30Days.revenue.map((r) => ({
                    date: r.date,
                    value: parseFloat(r.amount),
                  }))}
                  type="line"
                  title="Revenue Trend (Last 30 Days)"
                  valueFormatter={(v) => `$${v.toFixed(2)}`}
                />
                <SimpleChart
                  data={businessData.trendData.last30Days.bookings.map((b) => ({
                    date: b.date,
                    value: b.count,
                  }))}
                  type="bar"
                  title="Bookings Trend (Last 30 Days)"
                  valueFormatter={(v) => v.toString()}
                />
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard
                  label="Average Booking Value"
                  value={`$${businessData.revenueStats.averageBookingValue}`}
                />
                <MetricCard
                  label="Total Bookings"
                  value={businessData.bookingStats.totalBookings}
                />
                <MetricCard
                  label="Capacity Utilization"
                  value={`${businessData.capacityUtilization.overallUtilization.toFixed(1)}%`}
                  color={
                    businessData.capacityUtilization.overallUtilization >= 80
                      ? "success"
                      : businessData.capacityUtilization.overallUtilization >= 50
                      ? "warning"
                      : "danger"
                  }
                />
                <MetricCard
                  label="Cancellation Rate"
                  value={`${businessData.bookingStats.cancellationRate.toFixed(1)}%`}
                  color={
                    businessData.bookingStats.cancellationRate < 10
                      ? "success"
                      : "warning"
                  }
                />
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
