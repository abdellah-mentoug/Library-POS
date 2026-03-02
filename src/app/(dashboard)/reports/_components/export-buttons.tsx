"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { generateCSV, downloadCSV } from "@/lib/utils/csv-export";

interface ExportButtonsProps {
  headers: string[];
  rows: Record<string, unknown>[];
  filename: string;
}

export function ExportButtons({ headers, rows, filename }: ExportButtonsProps) {
  function handleCSV() {
    const csv = generateCSV(headers, rows);
    downloadCSV(csv, `${filename}.csv`);
  }

  return (
    <Button variant="outline" size="sm" onClick={handleCSV}>
      <Download className="mr-2 h-4 w-4" />
      Export CSV
    </Button>
  );
}
