"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import {
  format,
  parse,
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
import { formatLocalDateKey } from "@/lib/date-time";

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

  const dateStr = formatLocalDateKey(date);

  // Navigation helpers
  const goToPrevDay = () => {
    const prevDay = subDays(date, 1);
    router.push(`/org/${slug}/calendar/${formatLocalDateKey(prevDay)}` as Route);
  };

  const goToNextDay = () => {
    const nextDay = addDays(date, 1);
    router.push(`/org/${slug}/calendar/${formatLocalDateKey(nextDay)}` as Route);
  };

  // Fetch tour runs for this date
  const { data: tourRunsData, isLoading: tourRunsLoading } =
    trpc.tourRun.getForDate.useQuery({ date: dateStr });

  // Fetch bookings for this date
  const { data: bookingsData, isLoading: bookingsLoading } =
    trpc.booking.list.useQuery({
      pagination: { page: 1, limit: 100 },
      filters: {
        bookingDateRange: { from: dateStr, to: dateStr },
      },
      sort: { field: "createdAt", direction: "desc" },
    });

  const tourRuns = tourRunsData || [];
  const bookings = bookingsData?.data || [];

  // Group bookings by tour run key (tourId + time)
  const bookingsByTourRun = useMemo(() => {
    const grouped: Record<string, typeof bookings> = {};
    for (const booking of bookings) {
      if (booking.tourId && booking.bookingTime) {
        const key = `${booking.tourId}-${booking.bookingTime}`;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(booking);
      }
    }
    return grouped;
  }, [bookings]);

  // Calculate stats - only count tour runs that have bookings
  const stats = useMemo(() => {
    const totalGuests = bookings.reduce(
      (sum, b) => sum + b.totalParticipants,
      0
    );
    const totalRevenue = bookings.reduce(
      (sum, b) => sum + parseFloat(b.total || "0"),
      0
    );
    // Count only tour runs that have bookings
    const tourRunsWithBookings = tourRuns.filter((tr) => {
      const key = `${tr.tourId}-${tr.time}`;
      return (bookingsByTourRun[key] || []).length > 0;
    });
    const tourCount = tourRunsWithBookings.length;
    const needsGuide = tourRunsWithBookings.filter((tr) => {
      const required = tr.guidesRequired ?? 1;
      const assigned = tr.guidesAssigned ?? 0;
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
  }, [bookings, tourRuns, bookingsByTourRun]);

  const isLoading = tourRunsLoading || bookingsLoading;

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
          {tourRuns
            .filter((tourRun) => {
              const key = `${tourRun.tourId}-${tourRun.time}`;
              return (bookingsByTourRun[key] || []).length > 0;
            })
            .map((tourRun) => {
              const key = `${tourRun.tourId}-${tourRun.time}`;
              const tourRunBookings = bookingsByTourRun[key] || [];

              // Create a schedule-like object for backward compatibility with DayTourSection
              const startsAt = new Date(`${dateStr}T${tourRun.time}:00`);
              const endsAt = new Date(startsAt.getTime() + (tourRun.durationMinutes || 60) * 60000);
              const scheduleCompatible = {
                id: key,
                tourId: tourRun.tourId,
                startsAt,
                endsAt,
                maxParticipants: tourRun.capacity,
                bookedCount: tourRun.bookedCount,
                guidesRequired: tourRun.guidesRequired,
                guidesAssigned: tourRun.guidesAssigned,
                status: "scheduled" as const,
                tour: {
                  id: tourRun.tourId,
                  name: tourRun.tourName,
                },
              };

              return (
                <DayTourSection
                  key={key}
                  schedule={scheduleCompatible}
                  bookings={tourRunBookings}
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
            ? "text-warning"
            : "text-foreground"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
