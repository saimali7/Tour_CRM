"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { getDateRangeFromString } from "@/lib/report-utils";
import { ReportHeader } from "@/components/reports/ReportHeader";
import { SummaryCards } from "@/components/reports/SummaryCards";
import { ReportTable, ColumnDef } from "@/components/reports/ReportTable";
import { UserCircle, Map, Users, Star } from "lucide-react";

export default function GuideReportPage() {
  const params = useParams();
  const orgSlug = params.slug as string;
  const [dateRangeString, setDateRangeString] = useState("this_month");
  const dateRange = useMemo(() => getDateRangeFromString(dateRangeString), [dateRangeString]);

  // Fetch report data - this returns guide assignments
  const { data, isLoading } = trpc.reports.getGuideReport.useQuery({
    dateRange,
  });

  // Calculate basic stats from guide assignments
  const totalAssignments = data?.length ?? 0;
  const confirmedAssignments = data?.filter((a: any) => a.status === "confirmed").length ?? 0;
  const uniqueGuides = new Set(data?.map((a: any) => a.guideId)).size;

  // Prepare summary cards
  const summaryCards = [
    {
      name: "Total Assignments",
      value: totalAssignments,
      icon: Map,
    },
    {
      name: "Confirmed",
      value: confirmedAssignments,
      icon: UserCircle,
    },
    {
      name: "Active Guides",
      value: uniqueGuides,
      icon: Users,
    },
  ];

  // Prepare assignment table columns - using any since data is empty array for now
  const assignmentColumns: ColumnDef<any>[] = [
    {
      key: "scheduleId",
      header: "Schedule",
      render: (row: any) => (
        <span className="font-medium text-foreground">{row.scheduleId?.slice(0, 8)}...</span>
      ),
    },
    {
      key: "guideId",
      header: "Guide",
      render: (row: any) => (
        <span className="text-foreground">{row.guideId?.slice(0, 8)}...</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      align: "center",
      render: (row: any) => (
        <span
          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
            row.status === "confirmed"
              ? "bg-success/10 text-success"
              : row.status === "pending"
              ? "bg-warning/10 text-warning"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {row.status || "N/A"}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Assigned",
      render: (row: any) => (
        <span className="text-foreground">
          {row.createdAt ? new Date(row.createdAt).toLocaleDateString() : "N/A"}
        </span>
      ),
    },
  ];

  // Handle export
  const handleExport = () => {
    if (!data) return;

    const exportData = data.map((row: any) => ({
      "Schedule ID": row.scheduleId,
      "Guide ID": row.guideId,
      Status: row.status,
      "Assigned At": new Date(row.createdAt).toLocaleDateString(),
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
    link.setAttribute("download", `guide-report-${dateRangeString}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <ReportHeader
        title="Guide Report"
        description="Guide assignments and activity metrics"
        dateRange={dateRangeString}
        onDateRangeChange={setDateRangeString}
        onExport={data ? handleExport : undefined}
      />

      {/* Summary cards */}
      <SummaryCards cards={summaryCards} />

      {/* Guide assignments table */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Guide Assignments
        </h2>
        <ReportTable
          columns={assignmentColumns}
          data={data ?? []}
          isLoading={isLoading}
          emptyMessage="No guide assignments for the selected period"
        />
      </div>
    </div>
  );
}
