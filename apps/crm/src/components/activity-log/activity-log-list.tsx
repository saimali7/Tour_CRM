"use client";

import { trpc } from "@/lib/trpc";
import { format, formatDistanceToNow } from "date-fns";
import {
  Calendar,
  User,
  Users,
  CreditCard,
  Map,
  Building2,
  Clock,
  CheckCircle,
  XCircle,
  Edit,
  Plus,
  Trash,
  UserCheck,
  RefreshCw,
} from "lucide-react";

type ActivityEntity = "booking" | "schedule" | "tour" | "customer" | "guide" | "organization" | "payment";

interface ActivityLogListProps {
  entityType?: ActivityEntity;
  entityId?: string;
  limit?: number;
  showFilters?: boolean;
}

const entityIcons: Record<ActivityEntity, typeof Calendar> = {
  booking: Calendar,
  schedule: Clock,
  tour: Map,
  customer: Users,
  guide: User,
  organization: Building2,
  payment: CreditCard,
};

const actionIcons: Record<string, typeof Plus> = {
  created: Plus,
  updated: Edit,
  cancelled: XCircle,
  confirmed: CheckCircle,
  completed: CheckCircle,
  refunded: RefreshCw,
  deleted: Trash,
  assigned: UserCheck,
  activated: CheckCircle,
  deactivated: XCircle,
};

function getActionIcon(action: string) {
  const actionType = action.split(".")[1] || "";
  for (const [key, Icon] of Object.entries(actionIcons)) {
    if (actionType.includes(key)) {
      return Icon;
    }
  }
  return Edit;
}

function getActionColor(action: string): string {
  if (action.includes("created") || action.includes("confirmed") || action.includes("activated")) {
    return "text-green-600 bg-green-50";
  }
  if (action.includes("cancelled") || action.includes("deleted") || action.includes("deactivated")) {
    return "text-red-600 bg-red-50";
  }
  if (action.includes("updated") || action.includes("assigned")) {
    return "text-blue-600 bg-blue-50";
  }
  if (action.includes("refunded")) {
    return "text-yellow-600 bg-yellow-50";
  }
  return "text-gray-600 bg-gray-50";
}

export function ActivityLogList({
  entityType,
  entityId,
  limit = 20,
  showFilters = false,
}: ActivityLogListProps) {
  const query = entityType && entityId
    ? trpc.activityLog.getForEntity.useQuery({
        entityType,
        entityId,
        pagination: { page: 1, limit },
      })
    : trpc.activityLog.getRecent.useQuery({ limit });

  if (query.isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (query.error) {
    return (
      <div className="text-center py-8 text-red-500">
        Error loading activity log
      </div>
    );
  }

  const logs = "data" in query.data! ? query.data.data : query.data;

  if (!logs || logs.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No activity recorded yet
      </div>
    );
  }

  return (
    <div className="flow-root">
      <ul className="-mb-8">
        {logs.map((log, idx) => {
          const EntityIcon = entityIcons[log.entityType as ActivityEntity] || Calendar;
          const ActionIcon = getActionIcon(log.action);
          const isLast = idx === logs.length - 1;

          return (
            <li key={log.id}>
              <div className="relative pb-8">
                {!isLast && (
                  <span
                    className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200"
                    aria-hidden="true"
                  />
                )}
                <div className="relative flex items-start space-x-3">
                  <div
                    className={`relative flex h-8 w-8 items-center justify-center rounded-full ring-8 ring-white ${getActionColor(log.action)}`}
                  >
                    <ActionIcon className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-gray-900">
                        {log.description}
                      </p>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                        <EntityIcon className="h-3 w-3 mr-1" />
                        {log.entityType}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                      <span>
                        {log.actorName || (log.actorType === "system" ? "System" : "Unknown")}
                      </span>
                      <span>·</span>
                      <time
                        dateTime={new Date(log.createdAt).toISOString()}
                        title={format(new Date(log.createdAt), "PPpp")}
                      >
                        {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                      </time>
                    </div>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function ActivityLogCard({
  entityType,
  entityId,
  title = "Activity Log",
  limit = 10,
}: {
  entityType?: ActivityEntity;
  entityId?: string;
  title?: string;
  limit?: number;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <ActivityLogList entityType={entityType} entityId={entityId} limit={limit} />
    </div>
  );
}
