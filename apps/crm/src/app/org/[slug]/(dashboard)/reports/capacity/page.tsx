"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { getDateRangeFromString } from "@/lib/report-utils";
import { ReportHeader } from "@/components/reports/ReportHeader";
import { ReportChart } from "@/components/reports/ReportChart";
import { ReportTable, ColumnDef } from "@/components/reports/ReportTable";
import { SimpleBarChart } from "@/components/reports/SimpleBarChart";
import { TrendingUp, AlertTriangle } from "lucide-react";

interface UtilizationByTour {
  tourId: string;
  tourName: string;
  totalCapacity: number;
  bookedCount: number;
  utilization: number;
  scheduleCount: number;
}

interface UnderperformingSchedule {
  scheduleId: string;
  tourName: string;
  startsAt: Date;
  utilization: number;
  bookedCount: number;
  maxParticipants: number;
}

export default function CapacityReportPage() {
  const params = useParams();
  const orgSlug = params.slug as string;
  const [dateRangeString, setDateRangeString] = useState("this_month");
  const dateRange = useMemo(() => getDateRangeFromString(dateRangeString), [dateRangeString]);

  // Fetch report data
  const { data, isLoading } = trpc.reports.getCapacityReport.useQuery({
    dateRange,
  });

  // Calculate overall utilization percentage
  const utilizationPercentage = data?.overallUtilization ?? 0;

  // Get utilization color
  const getUtilizationColor = (rate: number) => {
    if (rate >= 80) return "text-green-600";
    if (rate >= 60) return "text-yellow-600";
    if (rate >= 40) return "text-orange-600";
    return "text-red-600";
  };

  const getUtilizationBgColor = (rate: number) => {
    if (rate >= 80) return "bg-green-500";
    if (rate >= 60) return "bg-yellow-500";
    if (rate >= 40) return "bg-orange-500";
    return "bg-red-500";
  };

  // Prepare chart data - Utilization by tour
  const utilizationByTour =
    data?.utilizationByTour.map((point) => ({
      label: point.tourName,
      value: point.utilization,
    })) ?? [];

  // Prepare chart data - Utilization by day of week
  const utilizationByDayOfWeek =
    data?.utilizationByDayOfWeek.map((point) => ({
      label: point.dayName,
      value: point.utilization,
    })) ?? [];

  // Prepare tour utilization table columns
  const tourColumns: ColumnDef<UtilizationByTour>[] = [
    {
      key: "tourName",
      header: "Tour",
      sortable: true,
      render: (row) => (
        <span className="font-medium text-gray-900">{row.tourName}</span>
      ),
    },
    {
      key: "totalCapacity",
      header: "Total Capacity",
      sortable: true,
      align: "center",
      render: (row) => <span className="text-gray-700">{row.totalCapacity}</span>,
    },
    {
      key: "bookedCount",
      header: "Booked Spots",
      sortable: true,
      align: "center",
      render: (row) => (
        <span className="font-semibold text-gray-900">{row.bookedCount}</span>
      ),
    },
    {
      key: "utilization",
      header: "Utilization",
      sortable: true,
      align: "right",
      render: (row) => (
        <span
          className={`font-semibold ${getUtilizationColor(row.utilization)}`}
        >
          {row.utilization.toFixed(1)}%
        </span>
      ),
    },
  ];

  // Prepare underperforming schedules table columns
  const underperformingColumns: ColumnDef<UnderperformingSchedule>[] = [
    {
      key: "tourName",
      header: "Tour",
      sortable: true,
      render: (row) => (
        <span className="font-medium text-gray-900">{row.tourName}</span>
      ),
    },
    {
      key: "startsAt",
      header: "Date & Time",
      sortable: true,
      render: (row) => (
        <span className="text-gray-700">
          {new Date(row.startsAt).toLocaleDateString()} at {new Date(row.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      ),
    },
    {
      key: "bookedCount",
      header: "Booked / Capacity",
      align: "center",
      render: (row) => (
        <span className="text-gray-700">
          {row.bookedCount} / {row.maxParticipants}
        </span>
      ),
    },
    {
      key: "utilization",
      header: "Utilization",
      sortable: true,
      align: "right",
      render: (row) => (
        <span
          className={`font-semibold ${getUtilizationColor(row.utilization)}`}
        >
          {row.utilization.toFixed(1)}%
        </span>
      ),
    },
  ];

  // Handle export
  const handleExport = () => {
    if (!data) return;

    const exportData = data.utilizationByTour.map((row) => ({
      Tour: row.tourName,
      "Total Capacity": row.totalCapacity,
      "Booked Spots": row.bookedCount,
      "Utilization Rate": `${row.utilization.toFixed(1)}%`,
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
    link.setAttribute("download", `capacity-report-${dateRangeString}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <ReportHeader
        title="Capacity Report"
        description="Optimize utilization and schedule efficiency"
        dateRange={dateRangeString}
        onDateRangeChange={setDateRangeString}
        onExport={data ? handleExport : undefined}
      />

      {/* Overall utilization gauge */}
      <div className="rounded-lg border border-gray-200 bg-white p-8">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Overall Utilization
          </h2>
          <div className="flex items-center justify-center">
            <div className="relative w-48 h-48">
              {/* Background circle */}
              <svg className="w-full h-full" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="10"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke={
                    utilizationPercentage >= 80
                      ? "#10b981"
                      : utilizationPercentage >= 60
                      ? "#eab308"
                      : utilizationPercentage >= 40
                      ? "#f97316"
                      : "#ef4444"
                  }
                  strokeWidth="10"
                  strokeDasharray={`${utilizationPercentage * 2.51} 251`}
                  strokeLinecap="round"
                  transform="rotate(-90 50 50)"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span
                  className={`text-4xl font-bold ${getUtilizationColor(
                    utilizationPercentage
                  )}`}
                >
                  {utilizationPercentage.toFixed(1)}%
                </span>
                <span className="text-sm text-gray-500 mt-1">Utilization</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-8 max-w-md mx-auto">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">
                {data?.utilizationByTour.reduce((sum, t) => sum + t.totalCapacity, 0) ?? 0}
              </p>
              <p className="text-sm text-gray-500 mt-1">Total Capacity</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">
                {data?.utilizationByTour.reduce((sum, t) => sum + t.bookedCount, 0) ?? 0}
              </p>
              <p className="text-sm text-gray-500 mt-1">Booked Spots</p>
            </div>
          </div>
        </div>
      </div>

      {/* Utilization by tour chart */}
      <ReportChart
        title="Utilization by Tour"
        isLoading={isLoading}
        isEmpty={utilizationByTour.length === 0}
      >
        <SimpleBarChart
          data={utilizationByTour}
          horizontal
          maxValue={100}
          formatValue={(v) => `${v.toFixed(1)}%`}
        />
      </ReportChart>

      {/* Utilization by day of week chart */}
      <ReportChart
        title="Utilization by Day of Week"
        isLoading={isLoading}
        isEmpty={utilizationByDayOfWeek.length === 0}
      >
        <SimpleBarChart
          data={utilizationByDayOfWeek}
          formatValue={(v) => `${v.toFixed(1)}%`}
        />
      </ReportChart>

      {/* Utilization by tour table */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Tour Utilization Details
        </h2>
        <ReportTable
          columns={tourColumns}
          data={data?.utilizationByTour ?? []}
          isLoading={isLoading}
          emptyMessage="No capacity data available for the selected period"
        />
      </div>

      {/* Underperforming schedules */}
      {data?.underperformingSchedules &&
        data.underperformingSchedules.length > 0 && (
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <h2 className="text-lg font-semibold text-gray-900">
                Underperforming Schedules (Below 50% Utilization)
              </h2>
            </div>
            <ReportTable
              columns={underperformingColumns}
              data={data.underperformingSchedules}
              emptyMessage="No underperforming schedules found"
            />
          </div>
        )}
    </div>
  );
}
