"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { getDateRangeFromString } from "@/lib/report-utils";
import { downloadCsv } from "@/lib/utils";
import { ReportHeader } from "@/components/reports/ReportHeader";
import { SummaryCards } from "@/components/reports/SummaryCards";
import { ReportChart } from "@/components/reports/ReportChart";
import { ReportTable, ColumnDef } from "@/components/reports/ReportTable";
import { SimpleBarChart } from "@/components/reports/SimpleBarChart";
import { SimplePieChart } from "@/components/reports/SimplePieChart";
import {
  Users,
  UserPlus,
  RefreshCw,
  DollarSign,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import type { CustomerSegment } from "@tour/services";

export default function CustomerReportPage() {
  const params = useParams();
  const orgSlug = params.slug as string;
  const [dateRangeString, setDateRangeString] = useState("this_month");
  const dateRange = useMemo(() => getDateRangeFromString(dateRangeString), [dateRangeString]);

  // Fetch report data
  const { data, isLoading } = trpc.reports.getCustomerReport.useQuery({
    dateRange,
  });

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  // Prepare summary cards
  const summaryCards = [
    {
      name: "New Customers",
      value: data?.newCustomers ?? 0,
      icon: UserPlus,
    },
    {
      name: "Repeat Customers",
      value: data?.repeatCustomers ?? 0,
      icon: RefreshCw,
      subtitle: `${data?.repeatRate ?? 0}% repeat rate`,
    },
    {
      name: "Avg CLV",
      value: `$${data?.averageCLV ?? "0"}`,
      icon: DollarSign,
      subtitle: "Customer lifetime value",
    },
  ];

  // Prepare chart data - Customer segments
  const segmentColors: Record<CustomerSegment, string> = {
    vip: "#8b5cf6", // purple
    loyal: "#3b82f6", // blue
    promising: "#10b981", // green
    at_risk: "#f59e0b", // amber
    dormant: "#ef4444", // red
  };

  const customerSegments = data?.segmentDistribution
    ? Object.entries(data.segmentDistribution).map(([segment, count]) => ({
        label: segment.toUpperCase(),
        value: count,
        color: segmentColors[segment as CustomerSegment] || "#9ca3af",
      }))
    : [];

  // Prepare chart data - Geographic distribution
  const geographicData =
    data?.geographicDistribution.map((point) => ({
      label: point.country,
      value: point.count,
    })) ?? [];

  // Prepare acquisition source table data
  const acquisitionBySource = data?.acquisitionBySource
    ? Object.entries(data.acquisitionBySource).map(([source, count]) => ({
        source,
        count,
      }))
    : [];

  const sourceColumns: ColumnDef<{ source: string; count: number }>[] = [
    {
      key: "source",
      header: "Source",
      sortable: true,
      render: (row) => (
        <span className="font-medium text-foreground capitalize">{row.source}</span>
      ),
    },
    {
      key: "count",
      header: "Customers",
      sortable: true,
      align: "center",
      render: (row) => (
        <span className="font-semibold text-foreground">{row.count}</span>
      ),
    },
  ];

  // Handle export
  const handleExport = () => {
    if (!data || acquisitionBySource.length === 0) return;

    const exportData = acquisitionBySource.map((row) => ({
      Source: row.source,
      Customers: row.count,
    }));

    downloadCsv(exportData, `customer-report-${dateRangeString}`);
  };

  return (
    <div className="space-y-6">
      <ReportHeader
        title="Customer Report"
        description="Customer insights and lifetime value analysis"
        dateRange={dateRangeString}
        onDateRangeChange={setDateRangeString}
        onExport={data ? handleExport : undefined}
      />

      {/* Summary cards */}
      <SummaryCards cards={summaryCards} />

      {/* Two column charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Customer segments */}
        <ReportChart
          title="Customer Segments"
          isLoading={isLoading}
          isEmpty={customerSegments.length === 0}
        >
          <SimplePieChart data={customerSegments} />
        </ReportChart>

        {/* Segment definitions */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Segment Definitions
          </h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="h-4 w-4 rounded bg-primary/10 border border-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-foreground text-sm">VIP</p>
                <p className="text-xs text-muted-foreground">
                  5+ bookings or $1000+ lifetime value
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-4 w-4 rounded bg-primary/10 border border-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-foreground text-sm">Loyal</p>
                <p className="text-xs text-muted-foreground">
                  3-4 bookings or $500-$999 lifetime value
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-4 w-4 rounded bg-success mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-foreground text-sm">Promising</p>
                <p className="text-xs text-muted-foreground">
                  2 bookings, potential for growth
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-4 w-4 rounded bg-warning mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-foreground text-sm">At Risk</p>
                <p className="text-xs text-muted-foreground">
                  No booking in 90+ days
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-4 w-4 rounded bg-destructive mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-foreground text-sm">Dormant</p>
                <p className="text-xs text-muted-foreground">
                  No booking in 180+ days
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Geographic distribution */}
      <ReportChart
        title="Geographic Distribution"
        isLoading={isLoading}
        isEmpty={geographicData.length === 0}
      >
        <SimpleBarChart data={geographicData} horizontal />
      </ReportChart>

      {/* Customers by acquisition source table */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Customers by Acquisition Source
        </h2>
        <ReportTable
          columns={sourceColumns}
          data={acquisitionBySource}
          isLoading={isLoading}
          emptyMessage="No source data available"
        />
      </div>
    </div>
  );
}
