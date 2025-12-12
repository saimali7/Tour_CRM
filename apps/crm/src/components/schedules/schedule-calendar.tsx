"use client";

import { useMemo, useCallback } from "react";
import { Calendar, dateFnsLocalizer, Views, type Event } from "react-big-calendar";
import { format, parse, startOfWeek, getDay, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import { enUS } from "date-fns/locale";
import { useRouter, useParams } from "next/navigation";
import type { Route } from "next";

const locales = { "en-US": enUS };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales,
});

interface ScheduleEvent extends Event {
  id: string;
  title: string;
  start: Date;
  end: Date;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  tourName: string;
  guideName?: string;
  bookedCount: number;
  maxParticipants: number;
}

interface Schedule {
  id: string;
  startsAt: Date;
  endsAt: Date;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  bookedCount: number | null;
  maxParticipants: number;
  tour?: {
    id: string;
    name: string;
  };
  guide?: {
    firstName: string;
    lastName: string;
  } | null;
}

interface ScheduleCalendarProps {
  schedules: Schedule[];
  currentDate: Date;
  onDateChange: (date: Date) => void;
  view: "month" | "week" | "day" | "agenda";
  onViewChange: (view: "month" | "week" | "day" | "agenda") => void;
}

const defaultColors = { bg: "#dbeafe", border: "#2563eb", text: "#1e40af" };

const statusColors: Record<string, { bg: string; border: string; text: string }> = {
  scheduled: { bg: "#dbeafe", border: "#2563eb", text: "#1e40af" },
  in_progress: { bg: "#fef3c7", border: "#d97706", text: "#92400e" },
  completed: { bg: "#dcfce7", border: "#16a34a", text: "#166534" },
  cancelled: { bg: "#fee2e2", border: "#dc2626", text: "#991b1b" },
};

function getStatusColors(status: string) {
  return statusColors[status] ?? defaultColors;
}

export function ScheduleCalendar({
  schedules,
  currentDate,
  onDateChange,
  view,
  onViewChange,
}: ScheduleCalendarProps) {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  const events: ScheduleEvent[] = useMemo(() => {
    return schedules.map((schedule) => ({
      id: schedule.id,
      title: schedule.tour?.name || "Unknown Tour",
      start: new Date(schedule.startsAt),
      end: new Date(schedule.endsAt),
      status: schedule.status,
      tourName: schedule.tour?.name || "Unknown Tour",
      guideName: schedule.guide
        ? `${schedule.guide.firstName} ${schedule.guide.lastName}`
        : undefined,
      bookedCount: schedule.bookedCount || 0,
      maxParticipants: schedule.maxParticipants,
    }));
  }, [schedules]);

  const handleSelectEvent = useCallback(
    (event: ScheduleEvent) => {
      router.push(`/org/${slug}/schedules/${event.id}` as Route);
    },
    [router, slug]
  );

  const handleSelectSlot = useCallback(
    ({ start }: { start: Date }) => {
      const dateStr = format(start, "yyyy-MM-dd");
      router.push(`/org/${slug}/schedules/new?date=${dateStr}` as Route);
    },
    [router, slug]
  );

  const handleNavigate = useCallback(
    (newDate: Date) => {
      onDateChange(newDate);
    },
    [onDateChange]
  );

  const handleViewChange = useCallback(
    (newView: string) => {
      onViewChange(newView as "month" | "week" | "day" | "agenda");
    },
    [onViewChange]
  );

  const eventStyleGetter = useCallback((event: ScheduleEvent) => {
    const colors = getStatusColors(event.status);
    return {
      style: {
        backgroundColor: colors.bg,
        borderLeft: `3px solid ${colors.border}`,
        color: colors.text,
        borderRadius: "4px",
        padding: "2px 4px",
        fontSize: "12px",
        fontWeight: 500,
      },
    };
  }, []);

  const EventComponent = useCallback(
    ({ event }: { event: ScheduleEvent }) => {
      const availabilityText = `${event.bookedCount}/${event.maxParticipants}`;
      const isFull = event.bookedCount >= event.maxParticipants;

      return (
        <div className="flex flex-col gap-0.5 overflow-hidden">
          <span className="font-medium truncate">{event.title}</span>
          <span className="text-xs opacity-80">
            {availabilityText} {isFull && "(Full)"}
          </span>
        </div>
      );
    },
    []
  );

  const AgendaEventComponent = useCallback(
    ({ event }: { event: ScheduleEvent }) => {
      const colors = getStatusColors(event.status);
      const availabilityText = `${event.bookedCount}/${event.maxParticipants}`;
      const statusLabel =
        event.status === "in_progress" ? "In Progress" : event.status.charAt(0).toUpperCase() + event.status.slice(1);

      return (
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="font-medium">{event.title}</div>
            {event.guideName && (
              <div className="text-xs text-gray-500">Guide: {event.guideName}</div>
            )}
          </div>
          <div className="text-xs text-gray-500">{availabilityText}</div>
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
            style={{ backgroundColor: colors.bg, color: colors.text }}
          >
            {statusLabel}
          </span>
        </div>
      );
    },
    []
  );

  const viewsConfig = useMemo(
    () => ({
      month: true,
      week: true,
      day: true,
      agenda: true,
    }),
    []
  );

  return (
    <div className="h-[700px]">
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        views={viewsConfig}
        view={view}
        date={currentDate}
        onNavigate={handleNavigate}
        onView={handleViewChange}
        onSelectEvent={handleSelectEvent}
        onSelectSlot={handleSelectSlot}
        selectable
        popup
        eventPropGetter={eventStyleGetter}
        components={{
          event: EventComponent,
          agenda: {
            event: AgendaEventComponent,
          },
        }}
        formats={{
          timeGutterFormat: (date: Date) => format(date, "h a"),
          eventTimeRangeFormat: ({ start, end }: { start: Date; end: Date }) =>
            `${format(start, "h:mm a")} - ${format(end, "h:mm a")}`,
          agendaTimeFormat: (date: Date) => format(date, "h:mm a"),
          agendaTimeRangeFormat: ({ start, end }: { start: Date; end: Date }) =>
            `${format(start, "h:mm a")} - ${format(end, "h:mm a")}`,
          dayHeaderFormat: (date: Date) => format(date, "EEEE, MMMM d"),
          dayRangeHeaderFormat: ({ start, end }: { start: Date; end: Date }) =>
            `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`,
        }}
        messages={{
          today: "Today",
          previous: "Back",
          next: "Next",
          month: "Month",
          week: "Week",
          day: "Day",
          agenda: "Agenda",
          noEventsInRange: "No schedules in this range",
        }}
      />
    </div>
  );
}

export function getCalendarDateRange(date: Date): { from: Date; to: Date } {
  const start = startOfMonth(subMonths(date, 1));
  const end = endOfMonth(addMonths(date, 1));
  return { from: start, to: end };
}
