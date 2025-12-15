"use client";

import React, { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import {
  Calendar,
  Users,
  UserCheck,
  DollarSign,
  TrendingUp,
  BarChart3,
  AlertTriangle,
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

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatDate(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export default function DashboardPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const [activeTab, setActiveTab] = useState<TabType>("operations");
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  const utils = trpc.useUtils();

  const {
    data: operationsData,
    isLoading: operationsLoading,
    error: operationsError,
  } = trpc.dashboard.getOperationsDashboard.useQuery(undefined, {
    refetchInterval: 60000,
  });

  const {
    data: businessData,
    isLoading: businessLoading,
    error: businessError,
  } = trpc.dashboard.getBusinessDashboard.useQuery({}, {
    enabled: activeTab === "business",
  });

  const cancelScheduleMutation = trpc.schedule.cancel.useMutation({
    onSuccess: () => {
      utils.dashboard.getOperationsDashboard.invalidate();
      utils.schedule.list.invalidate();
    },
  });

  const handleDismissAlert = (alertId: string) => {
    setDismissedAlerts((prev) => new Set(prev).add(alertId));
  };

  // Calculate alerts for "Needs Action" section
  const alerts = useMemo(() => {
    if (!operationsData) return [];

    const alertsList: React.ReactElement[] = [];

    // Critical: Unassigned guides
    const unassignedSchedules = operationsData.upcomingSchedules.filter(
      (s) => s.hasUnconfirmedGuide && !dismissedAlerts.has(`unassigned-${s.scheduleId}`)
    );
    unassignedSchedules.forEach((schedule) => {
      alertsList.push(
        <ActionableAlert
          key={`unassigned-${schedule.scheduleId}`}
          id={`unassigned-${schedule.scheduleId}`}
          severity="critical"
          title="No guide assigned"
          description={`${schedule.tourName} • ${new Date(schedule.startsAt).toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
          })} at ${new Date(schedule.startsAt).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
          })} • ${schedule.bookedCount} guests`}
          entityId={schedule.scheduleId}
          entityType="schedule"
          actions={[
            {
              label: "View Schedule",
              onClick: () => router.push(`/org/${slug}/availability/${schedule.scheduleId}`),
            },
            {
              label: "Cancel Tour",
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

    // Warning: Low capacity schedules
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
      alertsList.push(
        <ActionableAlert
          key={`low-capacity-${schedule.scheduleId}`}
          id={`low-capacity-${schedule.scheduleId}`}
          severity="warning"
          title="Low bookings"
          description={`${schedule.tourName} • ${utilization}% full (${schedule.bookedCount}/${schedule.maxParticipants}) • ${new Date(schedule.startsAt).toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
          })}`}
          entityId={schedule.scheduleId}
          entityType="schedule"
          actions={[
            {
              label: "View Schedule",
              onClick: () => router.push(`/org/${slug}/availability/${schedule.scheduleId}`),
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

    // Info: Tours happening soon
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
      alertsList.push(
        <ActionableAlert
          key={`upcoming-soon-${schedule.scheduleId}`}
          id={`upcoming-soon-${schedule.scheduleId}`}
          severity="info"
          title={`Starting in ${minutesAway} minutes`}
          description={`${schedule.tourName} • ${schedule.bookedCount} guests${schedule.guideName ? ` • ${schedule.guideName}` : ""}`}
          entityId={schedule.scheduleId}
          entityType="schedule"
          actions={[
            {
              label: "View Manifest",
              onClick: () => router.push(`/org/${slug}/availability/${schedule.scheduleId}`),
            },
          ]}
          onDismiss={() => handleDismissAlert(`upcoming-soon-${schedule.scheduleId}`)}
        />
      );
    });

    return alertsList;
  }, [operationsData, dismissedAlerts, router, slug, cancelScheduleMutation]);

  if (operationsError || businessError) {
    return (
      <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6">
        <p className="text-destructive">
          Error loading dashboard: {operationsError?.message || businessError?.message}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="-mb-px flex gap-8">
          <button
            onClick={() => setActiveTab("operations")}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === "operations"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setActiveTab("business")}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === "business"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            }`}
          >
            Business
          </button>
        </nav>
      </div>

      {/* Operations Tab - Attention First Design */}
      {activeTab === "operations" && (
        <>
          {operationsLoading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : operationsData ? (
            <div className="space-y-6">
              {/* Human Greeting Header */}
              <div className="flex items-baseline justify-between">
                <div>
                  <h1 className="text-title text-foreground">
                    {getGreeting()}!{" "}
                    <span className="font-normal text-muted-foreground">
                      Here's what needs your attention.
                    </span>
                  </h1>
                </div>
                <p className="text-sm text-muted-foreground">{formatDate()}</p>
              </div>

              {/* NEEDS ACTION Section - First and Prominent */}
              {alerts.length > 0 && (
                <div className="rounded-xl border-2 border-warning/30 bg-warning/10 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle className="h-5 w-5 text-warning" />
                    <h2 className="text-lg font-semibold text-warning-foreground">
                      Needs Action ({alerts.length})
                    </h2>
                  </div>
                  <AlertsPanel>{alerts}</AlertsPanel>
                </div>
              )}

              {/* All Clear Message */}
              {alerts.length === 0 && (
                <div className="rounded-xl border border-success/30 bg-success/10 p-6 text-center">
                  <div className="mx-auto h-12 w-12 rounded-full bg-success/20 flex items-center justify-center mb-3">
                    <UserCheck className="h-6 w-6 text-success" />
                  </div>
                  <h3 className="text-lg font-medium text-success-foreground">All clear!</h3>
                  <p className="text-sm text-success-foreground/80 mt-1">
                    No urgent items need your attention right now.
                  </p>
                </div>
              )}

              {/* TODAY'S TOURS Section */}
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-subheading text-foreground">
                    Today's Tours
                  </h2>
                  <span className="text-sm text-muted-foreground">
                    {operationsData.upcomingSchedules.length} scheduled
                  </span>
                </div>
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
                    startsAt: new Date(s.startsAt),
                    endsAt: s.endsAt ? new Date(s.endsAt) : new Date(new Date(s.startsAt).getTime() + 2 * 60 * 60 * 1000),
                  }))}
                  orgSlug={slug}
                />
              </div>

              {/* QUICK STATS Section - At Bottom */}
              <div className="rounded-xl border border-border bg-muted/50 p-5">
                <h2 className="text-overline text-muted-foreground mb-4">
                  Quick Stats
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-card rounded-lg p-4 border border-border">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Calendar className="h-4 w-4" />
                      <span className="text-overline">Tours Today</span>
                    </div>
                    <p className="text-2xl font-bold text-foreground">
                      {operationsData.todaysOperations.scheduledTours}
                    </p>
                  </div>
                  <div className="bg-card rounded-lg p-4 border border-border">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Users className="h-4 w-4" />
                      <span className="text-overline">Guests Today</span>
                    </div>
                    <p className="text-2xl font-bold text-foreground">
                      {operationsData.todaysOperations.totalParticipants}
                    </p>
                  </div>
                  <div className="bg-card rounded-lg p-4 border border-border">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <UserCheck className="h-4 w-4" />
                      <span className="text-overline">Guides Working</span>
                    </div>
                    <p className="text-2xl font-bold text-foreground">
                      {operationsData.todaysOperations.guidesWorking}
                    </p>
                  </div>
                  <div className="bg-card rounded-lg p-4 border border-border">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-overline">Unassigned</span>
                    </div>
                    <p className={`text-2xl font-bold ${operationsData.upcomingSchedules.filter(s => s.hasUnconfirmedGuide).length > 0 ? 'text-warning' : 'text-foreground'}`}>
                      {operationsData.upcomingSchedules.filter(s => s.hasUnconfirmedGuide).length}
                    </p>
                  </div>
                </div>
              </div>

              {/* Recent Activity - Collapsible/Secondary */}
              <details className="rounded-xl border border-border bg-card group">
                <summary className="p-5 cursor-pointer flex items-center justify-between hover:bg-accent rounded-xl">
                  <h2 className="text-subheading text-foreground">
                    Recent Activity
                  </h2>
                  <span className="text-sm text-muted-foreground group-open:hidden">
                    Click to expand
                  </span>
                </summary>
                <div className="px-5 pb-5">
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
              </details>
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
              {/* Business Header */}
              <div>
                <h1 className="text-title text-foreground">Business Overview</h1>
                <p className="text-body text-muted-foreground mt-1">Track revenue, bookings, and performance</p>
              </div>

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
