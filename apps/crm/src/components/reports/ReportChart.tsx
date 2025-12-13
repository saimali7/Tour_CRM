"use client";

import { ReactNode } from "react";

interface ReportChartProps {
  title: string;
  children: ReactNode;
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyMessage?: string;
}

export function ReportChart({
  title,
  children,
  isLoading = false,
  isEmpty = false,
  emptyMessage = "No data available for the selected period",
}: ReportChartProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">{title}</h2>
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : isEmpty ? (
        <div className="text-center py-12 text-gray-500">
          <p>{emptyMessage}</p>
        </div>
      ) : (
        children
      )}
    </div>
  );
}
