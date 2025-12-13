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
import { SimplePieChart } from "@/components/reports/SimplePieChart";
import {
  CalendarDays,
  Users,
  UserPlus,
  Clock,
  XCircle,
  AlertCircle,
} from "lucide-react";

interface BookingByTour {
  tourId: string;
  tourName: string;
  bookingCount: number;
  participantCount: number;
}

export default function BookingReportPage() {
  const params = useParams();
  const orgSlug = params.slug as string;
  const [dateRangeString, setDateRangeString] = useState("this_month");
  const dateRange = useMemo(() => getDateRangeFromString(dateRangeString), [dateRangeString]);

  // Fetch report data
  const { data, isLoading } = trpc.reports.getBookingReport.useQuery({
    dateRange,
  });

  // Prepare summary cards
  const summaryCards = [
    {
      name: "Total Bookings",
      value: data?.totalBookings ?? 0,
      icon: CalendarDays,
    },
    {
      name: "Total Participants",
      value: data?.totalParticipants ?? 0,
      icon: Users,
      subtitle: `${data?.averagePartySize.toFixed(1) ?? 0} avg party size`,
    },
    {
      name: "Avg Lead Time",
      value: `${data?.averageLeadTime.toFixed(1) ?? 0} days`,
      icon: Clock,
      subtitle: "Days before tour date",
    },
    {
      name: "Cancellation Rate",
      value: `${data?.cancellationRate.toFixed(1) ?? 0}%`,
      icon: XCircle,
      changeType: ((data?.cancellationRate ?? 0) > 10 ? "negative" : "neutral") as "positive" | "negative" | "neutral",
    },
  ];

  // Additional metrics
  const additionalMetrics = [
    {
      name: "No-Show Rate",
      value: `${data?.noShowRate.toFixed(1) ?? 0}%`,
      icon: AlertCircle,
    },
  ];

  // Prepare chart data - Bookings by source
  const bookingsBySource =
    data?.bookingsBySource.map((point, index) => {
      const colors = [
        "#3b82f6", // blue
        "#10b981", // green
        "#f59e0b", // amber
        "#ef4444", // red
        "#8b5cf6", // purple
      ];
      return {
        label: point.source,
        value: point.count,
        color: colors[index % colors.length] || "#gray-500",
      };
    }) ?? [];

  // Prepare tour bookings table columns
  const tourColumns: ColumnDef<BookingByTour>[] = [
    {
      key: "tourName",
      header: "Tour",
      sortable: true,
      render: (row) => (
        <span className="font-medium text-gray-900">{row.tourName}</span>
      ),
    },
    {
      key: "bookingCount",
      header: "Bookings",
      sortable: true,
      align: "center",
      render: (row) => (
        <span className="font-semibold text-gray-900">{row.bookingCount}</span>
      ),
    },
    {
      key: "participantCount",
      header: "Participants",
      sortable: true,
      align: "center",
      render: (row) => <span className="text-gray-700">{row.participantCount}</span>,
    },
    {
      key: "participantCount",
      header: "Avg Party Size",
      sortable: false,
      align: "right",
      render: (row) => (
        <span className="text-gray-700">
          {row.bookingCount > 0 ? (row.participantCount / row.bookingCount).toFixed(1) : "0"}
        </span>
      ),
    },
  ];

  // Handle export
  const handleExport = () => {
    if (!data) return;

    const exportData = data.bookingsByTour.map((row) => ({
      Tour: row.tourName,
      Bookings: row.bookingCount,
      Participants: row.participantCount,
      "Average Party Size": row.bookingCount > 0 ? (row.participantCount / row.bookingCount).toFixed(1) : "0",
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
    link.setAttribute("download", `booking-report-${dateRangeString}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <ReportHeader
        title="Booking Report"
        description="Understand booking patterns and conversion rates"
        dateRange={dateRangeString}
        onDateRangeChange={setDateRangeString}
        onExport={data ? handleExport : undefined}
      />

      {/* Summary cards */}
      <SummaryCards cards={summaryCards} />

      {/* Additional metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {additionalMetrics.map((metric) => (
          <div
            key={metric.name}
            className="rounded-lg border border-gray-200 bg-white p-6"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-500">{metric.name}</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {metric.value}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <metric.icon className="h-6 w-6 text-primary" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bookings by source */}
      <ReportChart
        title="Bookings by Source"
        isLoading={isLoading}
        isEmpty={bookingsBySource.length === 0}
      >
        <SimplePieChart data={bookingsBySource} />
      </ReportChart>

      {/* Bookings by tour table */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Bookings by Tour
        </h2>
        <ReportTable
          columns={tourColumns}
          data={data?.bookingsByTour ?? []}
          isLoading={isLoading}
          emptyMessage="No booking data available for the selected period"
        />
      </div>
    </div>
  );
}
