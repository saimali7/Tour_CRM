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
    color: "bg-success/10 text-success",
    preview: "Track gross revenue, refunds, and net revenue",
  },
  {
    name: "Booking Report",
    description: "Understand booking patterns and conversion rates",
    href: "/reports/bookings",
    icon: CalendarDays,
    color: "bg-primary/10 text-primary",
    preview: "Analyze bookings by tour, source, and status",
  },
  {
    name: "Capacity Report",
    description: "Optimize utilization and schedule efficiency",
    href: "/reports/capacity",
    icon: TrendingUp,
    color: "bg-primary/10 text-primary",
    preview: "View utilization rates and identify opportunities",
  },
  {
    name: "Customer Report",
    description: "Customer insights and lifetime value analysis",
    href: "/reports/customers",
    icon: Users,
    color: "bg-warning/10 text-warning",
    preview: "Track customer segments and CLV metrics",
  },
  {
    name: "Guide Report",
    description: "Guide performance and activity metrics",
    href: "/reports/guides",
    icon: UserCircle,
    color: "bg-primary/10 text-primary",
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
        <h1 className="text-2xl font-bold text-foreground">Reports</h1>
        <p className="text-muted-foreground mt-1">
          Analyze your business performance with detailed reports
        </p>
      </div>

      {/* Report cards grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {reportCards.map((report) => (
          <Link
            key={report.name}
            href={`/org/${slug}${report.href}`}
            className="group relative rounded-lg border border-border bg-card p-6 hover:border-primary hover:shadow-md transition-all"
          >
            <div className="flex items-start gap-4">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-lg ${report.color} flex-shrink-0`}
              >
                <report.icon className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-foreground mb-1 flex items-center justify-between">
                  {report.name}
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  {report.description}
                </p>
                <p className="text-xs text-muted-foreground border-t border-border pt-3">
                  {report.preview}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick stats section */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Quick Overview
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="text-center p-4 border border-border rounded-lg">
            <p className="text-2xl font-bold text-foreground">-</p>
            <p className="text-sm text-muted-foreground mt-1">Total Revenue</p>
          </div>
          <div className="text-center p-4 border border-border rounded-lg">
            <p className="text-2xl font-bold text-foreground">-</p>
            <p className="text-sm text-muted-foreground mt-1">Total Bookings</p>
          </div>
          <div className="text-center p-4 border border-border rounded-lg">
            <p className="text-2xl font-bold text-foreground">-</p>
            <p className="text-sm text-muted-foreground mt-1">Avg Utilization</p>
          </div>
          <div className="text-center p-4 border border-border rounded-lg">
            <p className="text-2xl font-bold text-foreground">-</p>
            <p className="text-sm text-muted-foreground mt-1">Active Customers</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-4 text-center">
          Select a report above to view detailed analytics
        </p>
      </div>
    </div>
  );
}
