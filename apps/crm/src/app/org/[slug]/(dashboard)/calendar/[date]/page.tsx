"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import {
  format,
  parse,
  startOfDay,
  endOfDay,
  addDays,
  subDays,
  isValid,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar,
  Users,
  DollarSign,
  AlertTriangle,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { DayTourSection } from "@/components/calendar/day-tour-section";

export default function CalendarDayPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const dateParam = params.date as string;

  // Parse the date from URL
  const date = useMemo(() => {
    const parsed = parse(dateParam, "yyyy-MM-dd", new Date());
    return isValid(parsed) ? parsed : new Date();
  }, [dateParam]);

  const dateStr = format(date, "yyyy-MM-dd");

  // Navigation helpers
  const goToPrevDay = () => {
    const prevDay = subDays(date, 1);
    router.push(`/org/${slug}/calendar/${format(prevDay, "yyyy-MM-dd")}` as Route);
  };

  const goToNextDay = () => {
    const nextDay = addDays(date, 1);
    router.push(`/org/${slug}/calendar/${format(nextDay, "yyyy-MM-dd")}` as Route);
  };

  // Fetch schedules for this date
  const { data: schedulesData, isLoading: schedulesLoading } =
    trpc.schedule.list.useQuery({
      pagination: { page: 1, limit: 50 },
      filters: {
        dateRange: { from: startOfDay(date), to: endOfDay(date) },
      },
      sort: { field: "startsAt", direction: "asc" },
    });

  // Fetch bookings for this date
  const { data: bookingsData, isLoading: bookingsLoading } =
    trpc.booking.list.useQuery({
      pagination: { page: 1, limit: 100 },
      filters: {
        scheduleDateRange: { from: startOfDay(date), to: endOfDay(date) },
      },
      sort: { field: "createdAt", direction: "desc" },
    });

  const schedules = schedulesData?.data || [];
  const bookings = bookingsData?.data || [];

  // Group bookings by schedule (use scheduleId directly from booking)
  const bookingsBySchedule = useMemo(() => {
    const grouped: Record<string, typeof bookings> = {};
    for (const booking of bookings) {
      // Use scheduleId directly from booking, fallback to schedule.id for backwards compat
      const scheduleId = booking.scheduleId || booking.schedule?.id || "unassigned";
      if (!grouped[scheduleId]) grouped[scheduleId] = [];
      grouped[scheduleId].push(booking);
    }
    return grouped;
  }, [bookings]);

  // Calculate stats - only count tours that have bookings
  const stats = useMemo(() => {
    const totalGuests = bookings.reduce(
      (sum, b) => sum + b.totalParticipants,
      0
    );
    const totalRevenue = bookings.reduce(
      (sum, b) => sum + parseFloat(b.total || "0"),
      0
    );
    // Count only schedules that have bookings
    const toursWithBookings = schedules.filter((s) => {
      const scheduleBookings = bookingsBySchedule[s.id] || [];
      return scheduleBookings.length > 0;
    });
    const tourCount = toursWithBookings.length;
    const needsGuide = toursWithBookings.filter((s) => {
      const required = s.guidesRequired ?? 1;
      const assigned = s.guidesAssigned ?? 0;
      return assigned < required;
    }).length;
    const pendingPayments = bookings.filter(
      (b) => b.paymentStatus === "pending" || b.paymentStatus === "partial"
    ).length;
    const unconfirmed = bookings.filter((b) => b.status === "pending").length;
    const totalAlerts = needsGuide + pendingPayments + unconfirmed;

    return {
      totalGuests,
      totalRevenue,
      tourCount,
      totalAlerts,
      needsGuide,
      pendingPayments,
      unconfirmed,
    };
  }, [bookings, schedules, bookingsBySchedule]);

  const isLoading = schedulesLoading || bookingsLoading;

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Back to Calendar */}
          <Link
            href={`/org/${slug}/calendar` as Route}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Calendar
          </Link>

          {/* Date Navigation */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={goToPrevDay}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-xl font-semibold tracking-tight px-2">
              {format(date, "EEEE, MMMM d, yyyy")}
            </h1>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={goToNextDay}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* New Booking Button */}
        <Button asChild>
          <Link href={`/org/${slug}/bookings/new?date=${dateStr}` as Route}>
            <Plus className="h-4 w-4 mr-2" />
            New Booking
          </Link>
        </Button>
      </header>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          icon={<Users className="h-4 w-4" />}
          label="Guests"
          value={stats.totalGuests.toString()}
        />
        <StatCard
          icon={<DollarSign className="h-4 w-4" />}
          label="Revenue"
          value={formatCurrency(stats.totalRevenue)}
        />
        <StatCard
          icon={<Calendar className="h-4 w-4" />}
          label="Tours"
          value={stats.tourCount.toString()}
        />
        <StatCard
          icon={<AlertTriangle className="h-4 w-4" />}
          label="Alerts"
          value={stats.totalAlerts.toString()}
          variant={stats.totalAlerts > 0 ? "warning" : "default"}
        />
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="rounded-lg border border-border bg-card p-12">
          <div className="flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        </div>
      )}

      {/* Empty State - no bookings for this day */}
      {!isLoading && bookings.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <Calendar className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-lg font-semibold">No bookings</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            {format(date, "EEEE, MMMM d")} has no bookings yet
            {schedules.length > 0 && ` (${schedules.length} tour${schedules.length !== 1 ? 's' : ''} scheduled)`}
          </p>
          <Button asChild variant="outline">
            <Link href={`/org/${slug}/bookings/new?date=${dateStr}` as Route}>
              <Plus className="h-4 w-4 mr-2" />
              Add Booking
            </Link>
          </Button>
        </div>
      )}

      {/* Tour Sections - only tours with bookings */}
      {!isLoading && bookings.length > 0 && (
        <div className="space-y-4">
          {schedules
            .filter((schedule) => {
              const scheduleBookings = bookingsBySchedule[schedule.id] || [];
              return scheduleBookings.length > 0;
            })
            .map((schedule) => {
              const scheduleBookings = bookingsBySchedule[schedule.id] || [];
              return (
                <DayTourSection
                  key={schedule.id}
                  schedule={schedule}
                  bookings={scheduleBookings}
                  orgSlug={slug}
                />
              );
            })}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// STAT CARD COMPONENT
// =============================================================================

function StatCard({
  icon,
  label,
  value,
  variant = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  variant?: "default" | "warning";
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        {icon}
        <p className="text-xs font-medium uppercase tracking-wide">{label}</p>
      </div>
      <p
        className={`text-2xl font-bold tabular-nums ${
          variant === "warning" && value !== "0"
            ? "text-amber-600"
            : "text-foreground"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
