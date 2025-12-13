import { Users, AlertCircle, CheckCircle2, AlertTriangle, Eye } from "lucide-react";
import Link from "next/link";

interface TodayScheduleItem {
  scheduleId: string;
  time: string;
  tourName: string;
  tourId: string;
  bookedParticipants: number;
  capacity: number;
  guide: {
    id: string;
    name: string;
  } | null;
  status: "on_track" | "needs_attention" | "issue";
  statusReason?: string;
}

interface TodayScheduleProps {
  schedule: TodayScheduleItem[];
  orgSlug: string;
}

const statusConfig = {
  on_track: {
    icon: CheckCircle2,
    color: "text-green-600",
    bgColor: "bg-green-50",
    label: "On Track",
  },
  needs_attention: {
    icon: AlertTriangle,
    color: "text-yellow-600",
    bgColor: "bg-yellow-50",
    label: "Needs Attention",
  },
  issue: {
    icon: AlertCircle,
    color: "text-red-600",
    bgColor: "bg-red-50",
    label: "Issue",
  },
};

export function TodaySchedule({ schedule, orgSlug }: TodayScheduleProps) {
  if (schedule.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg font-medium">No tours scheduled for today</p>
        <p className="text-sm mt-1">Your schedule will appear here.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Time
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Tour
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Participants
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Guide
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {schedule.map((item) => {
            const config = statusConfig[item.status];
            const StatusIcon = config.icon;
            const utilization = (item.bookedParticipants / item.capacity) * 100;

            return (
              <tr key={item.scheduleId} className="hover:bg-gray-50">
                <td className="px-4 py-4 whitespace-nowrap">
                  <span className="text-sm font-medium text-gray-900">
                    {item.time}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <Link
                    href={`/org/${orgSlug}/tours/${item.tourId}`}
                    className="text-sm font-medium text-gray-900 hover:text-primary"
                  >
                    {item.tourName}
                  </Link>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-900">
                      {item.bookedParticipants} / {item.capacity}
                    </span>
                    <div className="w-16 bg-gray-200 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${
                          utilization >= 80
                            ? "bg-green-500"
                            : utilization >= 50
                            ? "bg-yellow-500"
                            : "bg-red-500"
                        }`}
                        style={{ width: `${Math.min(utilization, 100)}%` }}
                      />
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  {item.guide ? (
                    <span className="text-sm text-gray-900">{item.guide.name}</span>
                  ) : (
                    <span className="text-sm text-red-600 font-medium">
                      Not Assigned
                    </span>
                  )}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${config.bgColor}`}>
                    <StatusIcon className={`h-3.5 w-3.5 ${config.color}`} />
                    <span className={`text-xs font-medium ${config.color}`}>
                      {item.statusReason || config.label}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-right">
                  <Link
                    href={`/org/${orgSlug}/schedules/${item.scheduleId}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/5 rounded-lg transition-colors"
                  >
                    <Eye className="h-4 w-4" />
                    View
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
