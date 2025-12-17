"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { getDateRangeFromString } from "@/lib/report-utils";
import { downloadCsv } from "@/lib/utils";
import { ReportHeader } from "@/components/reports/ReportHeader";
import { SummaryCards } from "@/components/reports/SummaryCards";
import { ReportTable, type ColumnDef } from "@/components/reports/ReportTable";
import { UserCircle, Map, Users } from "lucide-react";

interface GuideReportRow {
  guideId: string;
  guideName: string;
  email: string;
  phone: string | null;
  totalAssignments: number;
  confirmedAssignments: number;
  pendingAssignments: number;
  declinedAssignments: number;
  totalParticipants: number;
  confirmationRate: number;
  averageParticipantsPerTour: number;
}

export default function GuideReportPage() {
  const params = useParams();
  const orgSlug = params.slug as string;
  const [dateRangeString, setDateRangeString] = useState("this_month");
  const dateRange = useMemo(() => getDateRangeFromString(dateRangeString), [dateRangeString]);

  // Fetch report data - this returns guide performance metrics
  const { data, isLoading } = trpc.reports.getGuideReport.useQuery({
    dateRange,
  });

  // Calculate stats from guide report data
  const totalGuides = data?.length ?? 0;
  const totalAssignments = data?.reduce((sum: number, g: GuideReportRow) => sum + g.totalAssignments, 0) ?? 0;
  const totalParticipants = data?.reduce((sum: number, g: GuideReportRow) => sum + g.totalParticipants, 0) ?? 0;

  // Prepare summary cards
  const summaryCards = [
    {
      name: "Active Guides",
      value: totalGuides,
      icon: Users,
    },
    {
      name: "Total Assignments",
      value: totalAssignments,
      icon: Map,
    },
    {
      name: "Total Participants",
      value: totalParticipants,
      icon: UserCircle,
    },
  ];

  // Prepare guide performance table columns
  const guideColumns: ColumnDef<GuideReportRow>[] = [
    {
      key: "guideName",
      header: "Guide",
      render: (row: GuideReportRow) => (
        <span className="font-medium text-foreground">{row.guideName}</span>
      ),
    },
    {
      key: "totalAssignments",
      header: "Assignments",
      sortable: true,
      align: "center",
      render: (row: GuideReportRow) => (
        <span className="text-foreground">{row.totalAssignments}</span>
      ),
    },
    {
      key: "confirmedAssignments",
      header: "Confirmed",
      sortable: true,
      align: "center",
      render: (row: GuideReportRow) => (
        <span className="text-success">{row.confirmedAssignments}</span>
      ),
    },
    {
      key: "confirmationRate",
      header: "Confirmation Rate",
      sortable: true,
      align: "center",
      render: (row: GuideReportRow) => (
        <span className="text-foreground">{row.confirmationRate}%</span>
      ),
    },
    {
      key: "totalParticipants",
      header: "Participants",
      sortable: true,
      align: "center",
      render: (row: GuideReportRow) => (
        <span className="text-foreground">{row.totalParticipants}</span>
      ),
    },
  ];

  // Handle export
  const handleExport = () => {
    if (!data || data.length === 0) return;

    const exportData = data.map((row: GuideReportRow) => ({
      "Guide Name": row.guideName,
      "Email": row.email,
      "Total Assignments": row.totalAssignments,
      "Confirmed": row.confirmedAssignments,
      "Declined": row.declinedAssignments,
      "Confirmation Rate": `${row.confirmationRate}%`,
      "Total Participants": row.totalParticipants,
    }));

    downloadCsv(exportData, `guide-report-${dateRangeString}`);
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

      {/* Guide performance table */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Guide Performance
        </h2>
        <ReportTable
          columns={guideColumns}
          data={data ?? []}
          isLoading={isLoading}
          emptyMessage="No guide data for the selected period"
        />
      </div>
    </div>
  );
}
