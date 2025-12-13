"use client";

import React, { useState } from "react";
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
import { useParams, useRouter } from "next/navigation";
import {
  StatCard,
  ActivityFeed,
  TodaySchedule,
  MetricCard,
  SimpleChart,
  ActionableAlert,
  AlertsPanel,
} from "@/components/dashboard";

type TabType = "operations" | "business";

export default function DashboardPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const [activeTab, setActiveTab] = useState<TabType>("operations");
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  const utils = trpc.useUtils();

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

  // Mutations for alert actions
  const cancelScheduleMutation = trpc.schedule.cancel.useMutation({
    onSuccess: () => {
      utils.dashboard.getOperationsDashboard.invalidate();
      utils.schedule.list.invalidate();
    },
  });

  const handleDismissAlert = (alertId: string) => {
    setDismissedAlerts((prev) => new Set(prev).add(alertId));
  };

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
              {/* Actionable Alerts Section */}
              {(() => {
                const alerts: React.ReactElement[] = [];

                // Critical: Unassigned guides
                const unassignedSchedules = operationsData.upcomingSchedules.filter(
                  (s) => s.hasUnconfirmedGuide && !dismissedAlerts.has(`unassigned-${s.scheduleId}`)
                );
                unassignedSchedules.forEach((schedule) => {
                  alerts.push(
                    <ActionableAlert
                      key={`unassigned-${schedule.scheduleId}`}
                      id={`unassigned-${schedule.scheduleId}`}
                      severity="critical"
                      title={`${schedule.tourName} has no guide assigned`}
                      description={`Scheduled for ${new Date(schedule.startsAt).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })} at ${new Date(schedule.startsAt).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}`}
                      entityId={schedule.scheduleId}
                      entityType="schedule"
                      actions={[
                        {
                          label: "Assign Guide",
                          onClick: () => router.push(`/org/${slug}/schedules/${schedule.scheduleId}`),
                        },
                        {
                          label: "Cancel Schedule",
                          variant: "destructive",
                          onClick: () => {
                            if (confirm(`Cancel ${schedule.tourName}? This will notify all booked customers.`)) {
                              cancelScheduleMutation.mutate({ id: schedule.scheduleId });
                            }
                          },
                          isLoading: cancelScheduleMutation.isPending,
                        },
                      ]}
                      onDismiss={() => handleDismissAlert(`unassigned-${schedule.scheduleId}`)}
                    />
                  );
                });

                // Warning: Low capacity schedules (less than 30% booked and more than 2 days away)
                const lowCapacitySchedules = operationsData.upcomingSchedules.filter((s) => {
                  const utilization = s.maxParticipants > 0 ? (s.bookedCount / s.maxParticipants) * 100 : 0;
                  const daysAway = Math.ceil((new Date(s.startsAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                  return (
                    utilization < 30 &&
                    daysAway > 2 &&
                    !s.hasUnconfirmedGuide &&
                    !dismissedAlerts.has(`low-capacity-${s.scheduleId}`)
                  );
                });
                lowCapacitySchedules.slice(0, 2).forEach((schedule) => {
                  const utilization = schedule.maxParticipants > 0
                    ? Math.round((schedule.bookedCount / schedule.maxParticipants) * 100)
                    : 0;
                  alerts.push(
                    <ActionableAlert
                      key={`low-capacity-${schedule.scheduleId}`}
                      id={`low-capacity-${schedule.scheduleId}`}
                      severity="warning"
                      title={`${schedule.tourName} has low bookings (${utilization}% full)`}
                      description={`Only ${schedule.bookedCount} of ${schedule.maxParticipants} spots booked for ${new Date(schedule.startsAt).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })} at ${new Date(schedule.startsAt).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}`}
                      entityId={schedule.scheduleId}
                      entityType="schedule"
                      actions={[
                        {
                          label: "View Schedule",
                          onClick: () => router.push(`/org/${slug}/schedules/${schedule.scheduleId}`),
                        },
                        {
                          label: "View Customers",
                          variant: "secondary",
                          onClick: () => router.push(`/org/${slug}/customers`),
                        },
                      ]}
                      onDismiss={() => handleDismissAlert(`low-capacity-${schedule.scheduleId}`)}
                    />
                  );
                });

                // Info: Tours happening soon (within 2 hours)
                const upcomingSoonSchedules = operationsData.upcomingSchedules.filter((s) => {
                  const hoursAway = (new Date(s.startsAt).getTime() - new Date().getTime()) / (1000 * 60 * 60);
                  return (
                    hoursAway > 0 &&
                    hoursAway <= 2 &&
                    s.bookedCount > 0 &&
                    !s.hasUnconfirmedGuide &&
                    !dismissedAlerts.has(`upcoming-soon-${s.scheduleId}`)
                  );
                });
                upcomingSoonSchedules.slice(0, 1).forEach((schedule) => {
                  const minutesAway = Math.round((new Date(schedule.startsAt).getTime() - new Date().getTime()) / (1000 * 60));
                  alerts.push(
                    <ActionableAlert
                      key={`upcoming-soon-${schedule.scheduleId}`}
                      id={`upcoming-soon-${schedule.scheduleId}`}
                      severity="info"
                      title={`${schedule.tourName} starts in ${minutesAway} minutes`}
                      description={`${schedule.bookedCount} participant${schedule.bookedCount !== 1 ? "s" : ""} expected${schedule.guideName ? ` with ${schedule.guideName}` : ""}`}
                      entityId={schedule.scheduleId}
                      entityType="schedule"
                      actions={[
                        {
                          label: "View Manifest",
                          onClick: () => router.push(`/org/${slug}/schedules/${schedule.scheduleId}`),
                        },
                      ]}
                      onDismiss={() => handleDismissAlert(`upcoming-soon-${schedule.scheduleId}`)}
                    />
                  );
                });

                return alerts.length > 0 ? <AlertsPanel>{alerts}</AlertsPanel> : null;
              })()}

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
