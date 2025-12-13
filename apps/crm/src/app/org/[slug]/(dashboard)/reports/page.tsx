import Link from "next/link";
import { getOrgContext } from "@/lib/auth";
import {
  DollarSign,
  CalendarDays,
  TrendingUp,
  Users,
  UserCircle,
  ArrowRight,
} from "lucide-react";

interface ReportsPageProps {
  params: Promise<{ slug: string }>;
}

const reportCards = [
  {
    name: "Revenue Report",
    description: "Analyze financial performance and revenue trends",
    href: "/reports/revenue",
    icon: DollarSign,
    color: "bg-green-500",
    preview: "Track gross revenue, refunds, and net revenue",
  },
  {
    name: "Booking Report",
    description: "Understand booking patterns and conversion rates",
    href: "/reports/bookings",
    icon: CalendarDays,
    color: "bg-blue-500",
    preview: "Analyze bookings by tour, source, and status",
  },
  {
    name: "Capacity Report",
    description: "Optimize utilization and schedule efficiency",
    href: "/reports/capacity",
    icon: TrendingUp,
    color: "bg-purple-500",
    preview: "View utilization rates and identify opportunities",
  },
  {
    name: "Customer Report",
    description: "Customer insights and lifetime value analysis",
    href: "/reports/customers",
    icon: Users,
    color: "bg-orange-500",
    preview: "Track customer segments and CLV metrics",
  },
  {
    name: "Guide Report",
    description: "Guide performance and activity metrics",
    href: "/reports/guides",
    icon: UserCircle,
    color: "bg-indigo-500",
    preview: "Monitor tours led and guide performance",
  },
];

export default async function ReportsPage({ params }: ReportsPageProps) {
  const { slug } = await params;
  const { organization } = await getOrgContext(slug);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-gray-500 mt-1">
          Analyze your business performance with detailed reports
        </p>
      </div>

      {/* Report cards grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {reportCards.map((report) => (
          <Link
            key={report.name}
            href={`/org/${slug}${report.href}`}
            className="group relative rounded-lg border border-gray-200 bg-white p-6 hover:border-primary hover:shadow-md transition-all"
          >
            <div className="flex items-start gap-4">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-lg ${report.color} text-white flex-shrink-0`}
              >
                <report.icon className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 mb-1 flex items-center justify-between">
                  {report.name}
                  <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  {report.description}
                </p>
                <p className="text-xs text-gray-500 border-t border-gray-100 pt-3">
                  {report.preview}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick stats section */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Quick Overview
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="text-center p-4 border border-gray-100 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">-</p>
            <p className="text-sm text-gray-500 mt-1">Total Revenue</p>
          </div>
          <div className="text-center p-4 border border-gray-100 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">-</p>
            <p className="text-sm text-gray-500 mt-1">Total Bookings</p>
          </div>
          <div className="text-center p-4 border border-gray-100 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">-</p>
            <p className="text-sm text-gray-500 mt-1">Avg Utilization</p>
          </div>
          <div className="text-center p-4 border border-gray-100 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">-</p>
            <p className="text-sm text-gray-500 mt-1">Active Customers</p>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-4 text-center">
          Select a report above to view detailed analytics
        </p>
      </div>
    </div>
  );
}
