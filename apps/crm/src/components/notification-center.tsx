"use client";

import { useState, useMemo, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import type { Route } from "next";
import { trpc } from "@/lib/trpc";
import { formatDistanceToNow } from "date-fns";
import {
  Bell,
  Calendar,
  Users,
  AlertTriangle,
  Check,
  Clock,
  UserCircle,
  X,
  ChevronRight,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  type: "warning" | "info" | "success" | "critical";
  title: string;
  description: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
}

export function NotificationCenter() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const [open, setOpen] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [isMounted, setIsMounted] = useState(false);

  // Prevent hydration mismatch with Radix Popover random IDs
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Get operations data to generate notifications
  const { data: operationsData } = trpc.dashboard.getOperationsDashboard.useQuery(undefined, {
    refetchInterval: 60000,
  });

  // Generate notifications from operations data
  const notifications: Notification[] = useMemo(() => {
    if (!operationsData) return [];

    const items: Notification[] = [];
    const now = new Date();

    // Unassigned guides (critical)
    operationsData.upcomingSchedules
      .filter((s) => s.hasUnconfirmedGuide)
      .forEach((schedule) => {
        items.push({
          id: `unassigned-${schedule.scheduleId}`,
          type: "critical",
          title: "No guide assigned",
          description: `${schedule.tourName} - ${new Date(schedule.startsAt).toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
          })}`,
          timestamp: new Date(schedule.startsAt),
          read: false,
          actionUrl: `/org/${slug}/calendar`,
          actionLabel: "View Calendar",
        });
      });

    // Tours starting soon (info)
    operationsData.upcomingSchedules
      .filter((s) => {
        const hoursAway = (new Date(s.startsAt).getTime() - now.getTime()) / (1000 * 60 * 60);
        return hoursAway > 0 && hoursAway <= 2 && s.bookedCount > 0 && !s.hasUnconfirmedGuide;
      })
      .forEach((schedule) => {
        const minutesAway = Math.round((new Date(schedule.startsAt).getTime() - now.getTime()) / (1000 * 60));
        items.push({
          id: `starting-soon-${schedule.scheduleId}`,
          type: "info",
          title: `Starting in ${minutesAway} min`,
          description: `${schedule.tourName} - ${schedule.bookedCount} guests`,
          timestamp: new Date(schedule.startsAt),
          read: false,
          actionUrl: `/org/${slug}/calendar`,
          actionLabel: "View Details",
        });
      });

    // Low capacity warnings
    operationsData.upcomingSchedules
      .filter((s) => {
        const utilization = s.maxParticipants > 0 ? (s.bookedCount / s.maxParticipants) * 100 : 0;
        const daysAway = Math.ceil((new Date(s.startsAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return utilization < 30 && daysAway > 2 && !s.hasUnconfirmedGuide;
      })
      .slice(0, 3)
      .forEach((schedule) => {
        items.push({
          id: `low-capacity-${schedule.scheduleId}`,
          type: "warning",
          title: "Low bookings",
          description: `${schedule.tourName} - ${schedule.bookedCount}/${schedule.maxParticipants} booked`,
          timestamp: new Date(schedule.startsAt),
          read: false,
          actionUrl: `/org/${slug}/calendar`,
          actionLabel: "View Schedule",
        });
      });

    return items.filter((n) => !dismissedIds.has(n.id));
  }, [operationsData, slug, dismissedIds]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => new Set(prev).add(id));
  };

  const handleNotificationClick = (notification: Notification) => {
    if (notification.actionUrl) {
      router.push(notification.actionUrl as Route);
      setOpen(false);
    }
  };

  const getIcon = (type: Notification["type"]) => {
    switch (type) {
      case "critical":
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      case "success":
        return <Check className="h-4 w-4 text-success" />;
      case "info":
      default:
        return <Clock className="h-4 w-4 text-info" />;
    }
  };

  // Render a placeholder button during SSR/initial mount to prevent hydration mismatch
  if (!isMounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="relative h-9 w-9"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9"
          aria-label={unreadCount > 0 ? `${unreadCount} notifications` : "Notifications"}
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-0"
        align="end"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-3">
          <h3 className="font-semibold">Notifications</h3>
          {notifications.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={() => setDismissedIds(new Set(notifications.map((n) => n.id)))}
            >
              Clear all
            </Button>
          )}
        </div>

        {/* Notification list */}
        <div className="max-h-[400px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Bell className="h-8 w-8 text-muted-foreground mb-2 opacity-50" />
              <p className="text-sm text-muted-foreground">All caught up!</p>
              <p className="text-xs text-muted-foreground mt-1">No new notifications</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "p-3 hover:bg-muted/50 cursor-pointer transition-colors relative group",
                    notification.type === "critical" && "bg-destructive/5"
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDismiss(notification.id);
                    }}
                    className="absolute top-2 right-2 p-1 rounded-full opacity-0 group-hover:opacity-100 hover:bg-muted transition-opacity"
                    aria-label="Dismiss notification"
                  >
                    <X className="h-3 w-3 text-muted-foreground" />
                  </button>
                  <div className="flex gap-3 pr-6">
                    <div className="flex-shrink-0 mt-0.5">
                      {getIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {notification.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {notification.description}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                        </span>
                        {notification.actionLabel && (
                          <span className="text-xs text-primary flex items-center gap-0.5">
                            {notification.actionLabel}
                            <ChevronRight className="h-3 w-3" />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="border-t border-border p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => {
                router.push(`/org/${slug}` as Route);
                setOpen(false);
              }}
            >
              View all on Today page
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// Compact version for collapsed sidebar
export function NotificationBell() {
  const params = useParams();
  const slug = params.slug as string;

  const { data: operationsData } = trpc.dashboard.getOperationsDashboard.useQuery(undefined, {
    refetchInterval: 60000,
  });

  const unreadCount = useMemo(() => {
    if (!operationsData) return 0;
    return operationsData.upcomingSchedules.filter((s) => s.hasUnconfirmedGuide).length;
  }, [operationsData]);

  return (
    <div className="relative">
      <Bell className="h-4 w-4" />
      {unreadCount > 0 && (
        <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-destructive text-[9px] font-medium text-white">
          {unreadCount > 9 ? "+" : unreadCount}
        </span>
      )}
    </div>
  );
}
