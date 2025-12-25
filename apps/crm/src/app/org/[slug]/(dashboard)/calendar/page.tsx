"use client";

import { trpc } from "@/lib/trpc";
import { Calendar as CalendarIcon, Plus, Users, ChevronRight, CheckCircle2, AlertCircle, CreditCard } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { useParams } from "next/navigation";
import { useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth, addMonths, subMonths, startOfDay, endOfDay } from "date-fns";
import { AvailabilityCalendar } from "@/components/availability/availability-calendar";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";

function getCalendarDateRange(date: Date): { from: Date; to: Date } {
  const from = startOfMonth(subMonths(date, 1));
  const to = endOfMonth(addMonths(date, 1));
  return { from, to };
}

export default function CalendarPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [tourFilter, setTourFilter] = useState<string>("all");
  const [selectedDateForBookings, setSelectedDateForBookings] = useState<Date | null>(null);

  const calendarDateRange = useMemo(
    () => getCalendarDateRange(selectedDate),
    [selectedDate]
  );

  // Tours for filter
  const { data: toursData } = trpc.tour.list.useQuery({
    pagination: { page: 1, limit: 100 },
    filters: { status: "active" },
  });

  // Calendar stats
  const { data: schedulesData, isLoading } = trpc.schedule.list.useQuery({
    pagination: { page: 1, limit: 200 },
    filters: {
      dateRange: calendarDateRange,
      tourId: tourFilter === "all" ? undefined : tourFilter,
    },
    sort: { field: "startsAt", direction: "asc" },
  });

  const schedules = schedulesData?.data || [];

  // Calculate inline stats
  const stats = useMemo(() => {
    const thisMonth = schedules.filter(s => {
      const date = new Date(s.startsAt);
      return date.getMonth() === selectedDate.getMonth() && date.getFullYear() === selectedDate.getFullYear();
    });
    const totalSchedules = thisMonth.length;
    const totalBooked = thisMonth.reduce((sum, s) => sum + (s.bookedCount ?? 0), 0);
    const totalCapacity = thisMonth.reduce((sum, s) => sum + s.maxParticipants, 0);
    const needsGuide = thisMonth.filter(s => s.guidesAssigned < s.guidesRequired).length;
    return { totalSchedules, totalBooked, totalCapacity, needsGuide };
  }, [schedules, selectedDate]);

  return (
    <div className="space-y-4">
      {/* Header: Title + Inline Stats + Actions */}
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <h1 className="text-lg font-semibold text-foreground">Calendar</h1>
          {/* Inline Stats */}
          <div className="hidden sm:flex items-center gap-5 text-sm text-muted-foreground">
            <span><span className="font-medium text-foreground">{stats.totalSchedules}</span> schedules</span>
            <span><span className="font-medium text-foreground">{stats.totalBooked}</span>/{stats.totalCapacity} booked</span>
            {stats.needsGuide > 0 && (
              <span><span className="font-medium text-amber-600">{stats.needsGuide}</span> need guide</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Tour Filter */}
          <Select value={tourFilter} onValueChange={setTourFilter}>
            <SelectTrigger className="w-[160px] h-9">
              <span className="truncate block text-left">
                {tourFilter === "all"
                  ? "All Tours"
                  : toursData?.data.find(t => t.id === tourFilter)?.name ?? "All Tours"}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tours</SelectItem>
              {toursData?.data.map((tour) => (
                <SelectItem key={tour.id} value={tour.id}>
                  {tour.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Add Schedule Button */}
          <Link
            href={`/org/${slug}/tours` as Route}
            className="inline-flex items-center gap-1.5 h-9 px-4 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Schedule
          </Link>
        </div>
      </header>

      {/* Calendar - contains its own navigation controls */}
      {isLoading ? (
        <div className="rounded-lg border border-border bg-card p-12">
          <div className="flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        </div>
      ) : (
        <AvailabilityCalendar
          schedules={schedules}
          currentDate={selectedDate}
          onDateChange={setSelectedDate}
          onDayClick={setSelectedDateForBookings}
          orgSlug={slug}
        />
      )}

      {/* Day Bookings Panel */}
      <Sheet open={!!selectedDateForBookings} onOpenChange={() => setSelectedDateForBookings(null)}>
        <SheetContent className="w-[400px] sm:w-[540px]">
          {selectedDateForBookings && (
            <DayBookingsPanel
              date={selectedDateForBookings}
              orgSlug={slug}
              onClose={() => setSelectedDateForBookings(null)}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

interface DayBookingsPanelProps {
  date: Date;
  orgSlug: string;
  onClose: () => void;
}

function DayBookingsPanel({ date, orgSlug, onClose }: DayBookingsPanelProps) {
  // Fetch bookings for this date (by schedule start date, not booking creation date)
  const { data: bookingsData, isLoading } = trpc.booking.list.useQuery({
    pagination: { page: 1, limit: 100 },
    filters: {
      scheduleDateRange: {
        from: startOfDay(date),
        to: endOfDay(date),
      },
    },
    sort: { field: "createdAt", direction: "desc" },
  });

  const bookings = bookingsData?.data || [];

  // Group bookings by status
  const confirmedBookings = bookings.filter(b => b.status === "confirmed");
  const pendingBookings = bookings.filter(b => b.status === "pending");

  // Calculate stats
  const totalGuests = bookings.reduce((sum, b) => sum + b.totalParticipants, 0);
  const totalRevenue = bookings.reduce((sum, b) => sum + parseFloat(b.total || "0"), 0);
  const paidBookings = bookings.filter(b => b.paymentStatus === "paid").length;

  const getStatusIcon = (status: string, paymentStatus: string) => {
    if (status === "confirmed" && paymentStatus === "paid") {
      return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
    }
    if (status === "pending") {
      return <AlertCircle className="h-3.5 w-3.5 text-amber-500" />;
    }
    if (paymentStatus !== "paid") {
      return <CreditCard className="h-3.5 w-3.5 text-amber-500" />;
    }
    return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
  };

  const getStatusBadge = (status: string, paymentStatus: string) => {
    if (status === "confirmed" && paymentStatus === "paid") {
      return <Badge className="bg-emerald-500/10 text-emerald-600 border-0">Ready</Badge>;
    }
    if (status === "pending") {
      return <Badge className="bg-amber-500/10 text-amber-600 border-0">Pending</Badge>;
    }
    if (paymentStatus !== "paid") {
      return <Badge className="bg-amber-500/10 text-amber-600 border-0">Unpaid</Badge>;
    }
    return <Badge className="bg-emerald-500/10 text-emerald-600 border-0">{status}</Badge>;
  };

  return (
    <div className="space-y-5">
      <SheetHeader>
        <SheetTitle className="text-lg flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-primary" />
          {format(date, "EEEE, MMMM d, yyyy")}
        </SheetTitle>
        <p className="text-sm text-muted-foreground">
          {bookings.length} booking{bookings.length !== 1 ? "s" : ""} for this day
        </p>
      </SheetHeader>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-lg bg-muted/50 text-center">
          <p className="text-xl font-bold text-foreground">{bookings.length}</p>
          <p className="text-xs text-muted-foreground">Bookings</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/50 text-center">
          <p className="text-xl font-bold text-foreground">{totalGuests}</p>
          <p className="text-xs text-muted-foreground">Guests</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/50 text-center">
          <p className="text-xl font-bold text-primary">${totalRevenue.toFixed(0)}</p>
          <p className="text-xs text-muted-foreground">Revenue</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="flex items-center justify-between text-sm px-1">
        <span className="text-muted-foreground">
          <span className="font-medium text-emerald-600">{confirmedBookings.length}</span> confirmed
        </span>
        <span className="text-muted-foreground">
          <span className="font-medium text-amber-600">{pendingBookings.length}</span> pending
        </span>
        <span className="text-muted-foreground">
          <span className="font-medium text-foreground">{paidBookings}</span>/{bookings.length} paid
        </span>
      </div>

      {/* Bookings List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-foreground">All Bookings</h3>
          <Link
            href={`/org/${orgSlug}/bookings?dateRange=${format(date, "yyyy-MM-dd")}` as Route}
            className="text-xs text-primary hover:underline flex items-center gap-0.5"
          >
            View all
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        {isLoading ? (
          <div className="py-8 flex justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : bookings.length === 0 ? (
          <div className="py-8 text-center">
            <Users className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No bookings for this day</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              asChild
            >
              <Link href={`/org/${orgSlug}/bookings/new` as Route}>
                <Plus className="h-4 w-4 mr-1" />
                Create Booking
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {bookings.map((booking) => (
              <Link
                key={booking.id}
                href={`/org/${orgSlug}/bookings/${booking.id}` as Route}
                className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {getStatusIcon(booking.status, booking.paymentStatus)}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {booking.customer?.firstName} {booking.customer?.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {booking.tour?.name || "Tour"} • {booking.totalParticipants} guests
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="text-right">
                    <p className="text-sm font-medium tabular-nums">${parseFloat(booking.total || "0").toFixed(0)}</p>
                    {getStatusBadge(booking.status, booking.paymentStatus)}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-4 border-t">
        <Button className="flex-1" asChild>
          <Link href={`/org/${orgSlug}/bookings/new` as Route}>
            <Plus className="h-4 w-4 mr-2" />
            New Booking
          </Link>
        </Button>
        <Button variant="outline" className="flex-1" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
}
