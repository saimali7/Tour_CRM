import {
  Ticket,
  Users,
  Map,
  Calendar,
  DollarSign,
  UserPlus,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { formatDistanceToNow } from "date-fns";

interface ActivityItem {
  id: string;
  type: string;
  entityType: string;
  entityId: string;
  description: string;
  timestamp: Date;
  actorName: string;
}

interface ActivityFeedProps {
  activities: ActivityItem[];
  orgSlug: string;
}

const iconMap: Record<string, typeof Ticket> = {
  "booking.created": Ticket,
  "booking.updated": Edit,
  "booking.confirmed": CheckCircle,
  "booking.cancelled": XCircle,
  "booking.rescheduled": Calendar,
  "customer.created": UserPlus,
  "customer.updated": Users,
  "tour.created": Map,
  "tour.updated": Map,
  "schedule.created": Calendar,
  "guide.assigned": Users,
  "payment.received": DollarSign,
  default: AlertCircle,
};

const colorMap: Record<string, string> = {
  "booking.created": "bg-info/10 text-info",
  "booking.confirmed": "bg-success/10 text-success",
  "booking.cancelled": "bg-destructive/10 text-destructive",
  "customer.created": "bg-primary/10 text-primary",
  "payment.received": "bg-success/10 text-success",
  default: "bg-muted text-muted-foreground",
};

function getEntityLink(
  entityType: string,
  entityId: string,
  orgSlug: string
): string | null {
  switch (entityType) {
    case "booking":
      return `/org/${orgSlug}/bookings/${entityId}`;
    case "customer":
      return `/org/${orgSlug}/customers/${entityId}`;
    case "tour":
      return `/org/${orgSlug}/tours/${entityId}`;
    case "schedule":
      return `/org/${orgSlug}/availability/${entityId}`;
    default:
      return null;
  }
}

export function ActivityFeed({ activities, orgSlug }: ActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No recent activity to display.</p>
        <p className="text-sm mt-1">
          Activity will appear here as you create bookings and manage tours.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((activity) => {
        const IconComponent = iconMap[activity.type] || iconMap.default;
        const colorClass = colorMap[activity.type] || colorMap.default;
        const link = getEntityLink(activity.entityType, activity.entityId, orgSlug);
        const Icon = IconComponent;
        if (!Icon) return null;

        return (
          <div
            key={activity.id}
            className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
          >
            <div className={`p-2 rounded-lg ${colorClass} shrink-0`}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              {link ? (
                <Link
                  href={link as Route}
                  className="text-sm text-foreground hover:text-primary font-medium"
                >
                  {activity.description}
                </Link>
              ) : (
                <p className="text-sm text-foreground font-medium">
                  {activity.description}
                </p>
              )}
              <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                <span>{activity.actorName}</span>
                <span>•</span>
                <span>{formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
