"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { getDateRangeFromString } from "@/lib/report-utils";
import { ReportHeader } from "@/components/reports/ReportHeader";
import { SummaryCards } from "@/components/reports/SummaryCards";
import { ReportChart } from "@/components/reports/ReportChart";
import { ReportTable, ColumnDef } from "@/components/reports/ReportTable";
import { SimpleBarChart } from "@/components/reports/SimpleBarChart";
import { DollarSign, TrendingUp, TrendingDown, CreditCard } from "lucide-react";

interface RevenueByTour {
  tourId: string;
  tourName: string;
  revenue: string;
  bookingCount: number;
}

export default function RevenueReportPage() {
  const params = useParams();
  const orgSlug = params.slug as string;
  const [dateRangeString, setDateRangeString] = useState("this_month");

  // Convert string to actual date range
  const dateRange = useMemo(() => getDateRangeFromString(dateRangeString), [dateRangeString]);

  // Fetch report data
  const { data, isLoading } = trpc.reports.getRevenueReport.useQuery({
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
      name: "Total Revenue",
      value: formatCurrency(parseFloat(data?.totalRevenue ?? "0")),
      icon: DollarSign,
      change: data?.comparisonToPreviousPeriod.revenueChange
        ? `${data.comparisonToPreviousPeriod.revenueChange > 0 ? "+" : ""}${data.comparisonToPreviousPeriod.revenueChange.toFixed(1)}% vs previous period`
        : undefined,
      changeType:
        ((data?.comparisonToPreviousPeriod.revenueChange ?? 0) >= 0 ? "positive" : "negative") as "positive" | "negative" | "neutral",
    },
    {
      name: "Refunds",
      value: formatCurrency(parseFloat(data?.refunds ?? "0")),
      icon: TrendingDown,
    },
    {
      name: "Net Revenue",
      value: formatCurrency(parseFloat(data?.netRevenue ?? "0")),
      icon: TrendingUp,
    },
    {
      name: "Avg Booking Value",
      value: formatCurrency(parseFloat(data?.averageBookingValue ?? "0")),
      icon: CreditCard,
    },
  ];

  // Prepare chart data
  const chartData =
    data?.revenueByDay.map((point: { date: string; revenue: string }) => ({
      label: point.date,
      value: parseFloat(point.revenue),
    })) ?? [];

  // Prepare tour revenue columns
  const tourColumns: ColumnDef<RevenueByTour>[] = [
    {
      key: "tourName",
      header: "Tour",
      sortable: true,
      render: (row) => (
        <span className="font-medium text-gray-900">{row.tourName}</span>
      ),
    },
    {
      key: "revenue",
      header: "Revenue",
      sortable: true,
      align: "right" as const,
      render: (row: RevenueByTour) => (
        <span className="font-semibold text-gray-900">
          {formatCurrency(parseFloat(row.revenue))}
        </span>
      ),
    },
    {
      key: "bookingCount",
      header: "Bookings",
      sortable: true,
      align: "center" as const,
      render: (row: RevenueByTour) => (
        <span className="text-gray-700">{row.bookingCount}</span>
      ),
    },
    {
      key: "bookingCount",
      header: "Avg Value",
      sortable: false,
      align: "right" as const,
      render: (row: RevenueByTour) => (
        <span className="text-gray-700">
          {formatCurrency(row.bookingCount > 0 ? parseFloat(row.revenue) / row.bookingCount : 0)}
        </span>
      ),
    },
  ];

  // Handle export
  const handleExport = () => {
    if (!data) return;

    const exportData = data.revenueByTour.map((row: { tourName: string; revenue: string; bookingCount: number }) => ({
      Tour: row.tourName,
      Revenue: parseFloat(row.revenue),
      Bookings: row.bookingCount,
      "Average Value": row.bookingCount > 0 ? parseFloat(row.revenue) / row.bookingCount : 0,
    }));

    // Create CSV
    if (exportData.length === 0) return;
    const headers = Object.keys(exportData[0]!);
    const csvContent = [
      headers.join(","),
      ...exportData.map((row) =>
        headers
          .map((header) => {
            const value = row[header as keyof typeof row];
            return String(value ?? "");
          })
          .join(",")
      ),
    ].join("\n");

    // Download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `revenue-report-${dateRangeString}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <ReportHeader
        title="Revenue Report"
        description="Analyze financial performance and revenue trends"
        dateRange={dateRangeString}
        onDateRangeChange={setDateRangeString}
        onExport={data ? handleExport : undefined}
      />

      {/* Summary cards */}
      <SummaryCards cards={summaryCards} />

      {/* Revenue over time chart */}
      <ReportChart
        title="Revenue Over Time"
        isLoading={isLoading}
        isEmpty={chartData.length === 0}
      >
        <SimpleBarChart
          data={chartData}
          formatValue={formatCurrency}
        />
      </ReportChart>

      {/* Revenue by tour table */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Revenue by Tour
        </h2>
        <ReportTable
          columns={tourColumns}
          data={data?.revenueByTour ?? []}
          isLoading={isLoading}
          emptyMessage="No revenue data available for the selected period"
        />
      </div>

    </div>
  );
}
