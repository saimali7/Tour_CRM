import { getOrgContext } from "@/lib/auth";
import { CalendarDays, Users, Map, DollarSign } from "lucide-react";

interface DashboardPageProps {
  params: Promise<{ slug: string }>;
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { slug } = await params;
  const { organization } = await getOrgContext(slug);

  // Placeholder stats - will be replaced with real data
  const stats = [
    {
      name: "Total Bookings",
      value: "0",
      icon: CalendarDays,
      change: "—",
    },
    {
      name: "Active Customers",
      value: "0",
      icon: Users,
      change: "—",
    },
    {
      name: "Active Tours",
      value: "0",
      icon: Map,
      change: "—",
    },
    {
      name: "Revenue (MTD)",
      value: "$0",
      icon: DollarSign,
      change: "—",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">
          Welcome back to {organization.name}
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="rounded-lg border border-gray-200 bg-white p-6"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <stat.icon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">{stat.name}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <a
            href={`/org/${slug}/bookings/new`}
            className="flex items-center gap-3 rounded-lg border border-gray-200 p-4 hover:border-primary hover:bg-primary/5 transition-colors"
          >
            <CalendarDays className="h-5 w-5 text-primary" />
            <span className="font-medium text-gray-900">New Booking</span>
          </a>
          <a
            href={`/org/${slug}/customers/new`}
            className="flex items-center gap-3 rounded-lg border border-gray-200 p-4 hover:border-primary hover:bg-primary/5 transition-colors"
          >
            <Users className="h-5 w-5 text-primary" />
            <span className="font-medium text-gray-900">Add Customer</span>
          </a>
          <a
            href={`/org/${slug}/tours/new`}
            className="flex items-center gap-3 rounded-lg border border-gray-200 p-4 hover:border-primary hover:bg-primary/5 transition-colors"
          >
            <Map className="h-5 w-5 text-primary" />
            <span className="font-medium text-gray-900">Create Tour</span>
          </a>
          <a
            href={`/org/${slug}/schedules`}
            className="flex items-center gap-3 rounded-lg border border-gray-200 p-4 hover:border-primary hover:bg-primary/5 transition-colors"
          >
            <CalendarDays className="h-5 w-5 text-primary" />
            <span className="font-medium text-gray-900">View Calendar</span>
          </a>
        </div>
      </div>

      {/* Recent activity placeholder */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Recent Activity
        </h2>
        <div className="text-center py-8 text-gray-500">
          <p>No recent activity to display.</p>
          <p className="text-sm mt-1">
            Activity will appear here as you create bookings and manage tours.
          </p>
        </div>
      </div>
    </div>
  );
}
