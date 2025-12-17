"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadCsv } from "@/lib/utils";

interface ExportButtonProps {
  data?: Record<string, unknown>[];
  filename: string;
  isExporting?: boolean;
}

export function ExportButton({
  data = [],
  filename,
  isExporting = false,
}: ExportButtonProps) {
  const handleExport = () => {
    if (!data || data.length === 0) return;
    downloadCsv(data, filename);
  };

  return (
    <Button
      onClick={handleExport}
      disabled={isExporting || data.length === 0}
      variant="outline"
      size="default"
    >
      <Download className="h-4 w-4 mr-2" />
      {isExporting ? "Exporting..." : "Export CSV"}
    </Button>
  );
}
