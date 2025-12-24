"use client";

import { trpc } from "@/lib/trpc";
import { Calendar as CalendarIcon, Plus } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { useParams } from "next/navigation";
import { useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
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
import { cn } from "@/lib/utils";

interface ScheduleWithDetails {
  id: string;
  startsAt: Date;
  endsAt: Date;
  status: string;
  bookedCount: number | null;
  maxParticipants: number;
  guidesRequired: number;
  guidesAssigned: number;
  tour?: {
    id: string;
    name: string;
  };
}

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
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleWithDetails | null>(null);

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
          orgSlug={slug}
        />
      )}

      {/* Schedule Detail Panel */}
      <Sheet open={!!selectedSchedule} onOpenChange={() => setSelectedSchedule(null)}>
        <SheetContent className="w-[400px] sm:w-[540px]">
          {selectedSchedule && (
            <SchedulePanel
              schedule={selectedSchedule}
              orgSlug={slug}
              onClose={() => setSelectedSchedule(null)}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

interface SchedulePanelProps {
  schedule: ScheduleWithDetails;
  orgSlug: string;
  onClose: () => void;
}

function SchedulePanel({ schedule, orgSlug }: SchedulePanelProps) {
  const capacityPercent = schedule.maxParticipants > 0
    ? Math.round(((schedule.bookedCount || 0) / schedule.maxParticipants) * 100)
    : 0;

  const isFull = capacityPercent >= 100;
  const isLowCapacity = capacityPercent < 30 && capacityPercent > 0;

  // Fetch bookings for this schedule
  const { data: bookingsData } = trpc.booking.list.useQuery({
    pagination: { page: 1, limit: 50 },
    filters: { scheduleId: schedule.id },
  });

  const bookings = bookingsData?.data || [];

  return (
    <div className="space-y-6">
      <SheetHeader>
        <SheetTitle className="text-lg">
          {schedule.tour?.name || "Schedule"}
        </SheetTitle>
        <p className="text-sm text-muted-foreground">
          {format(new Date(schedule.startsAt), "EEEE, MMMM d 'at' h:mm a")}
        </p>
      </SheetHeader>

      {/* Capacity */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Capacity</span>
          <Badge variant={isFull ? "destructive" : isLowCapacity ? "secondary" : "default"}>
            {schedule.bookedCount || 0} / {schedule.maxParticipants}
          </Badge>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              "h-full transition-all",
              isFull ? "bg-destructive" : isLowCapacity ? "bg-yellow-500" : "bg-primary"
            )}
            style={{ width: `${Math.min(capacityPercent, 100)}%` }}
          />
        </div>
      </div>

      {/* Guide Status */}
      <div>
        <h3 className="text-sm font-medium mb-2">Guides</h3>
        <div className="p-3 rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Assigned</span>
            <Badge variant={schedule.guidesAssigned >= schedule.guidesRequired ? "default" : "secondary"}>
              {schedule.guidesAssigned} / {schedule.guidesRequired}
            </Badge>
          </div>
          {schedule.guidesAssigned < schedule.guidesRequired && (
            <p className="text-xs text-warning mt-1">
              Needs {schedule.guidesRequired - schedule.guidesAssigned} more guide{schedule.guidesRequired - schedule.guidesAssigned > 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>

      {/* Guests */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium">Guests</h3>
          <span className="text-xs text-muted-foreground">
            {bookings.length} bookings
          </span>
        </div>
        <div className="space-y-2 max-h-[200px] overflow-y-auto">
          {bookings.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No bookings yet
            </p>
          ) : (
            bookings.map((booking) => (
              <div
                key={booking.id}
                className="flex items-center justify-between p-2 rounded-lg border"
              >
                <div>
                  <p className="text-sm font-medium">
                    {booking.customer?.firstName} {booking.customer?.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {booking.customer?.phone || booking.customer?.email}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm">{booking.totalParticipants} pax</p>
                  <p className="text-xs font-mono text-muted-foreground">
                    {booking.referenceNumber.slice(-8)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-4 border-t">
        <Button className="flex-1">
          <Plus className="h-4 w-4 mr-2" />
          Book
        </Button>
        <Button variant="outline" className="flex-1">
          <CalendarIcon className="h-4 w-4 mr-2" />
          Manifest
        </Button>
      </div>
    </div>
  );
}
