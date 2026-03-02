import jsPDF from "jspdf";
import { STORE_CONFIG } from "./constants";

interface ReportColumn {
  header: string;
  key: string;
  width: number;
  align?: "left" | "right" | "center";
}

interface ReportConfig {
  title: string;
  dateRange: string;
  columns: ReportColumn[];
  rows: Record<string, unknown>[];
  summary?: { label: string; value: string }[];
}

export function generateReportPDF(config: ReportConfig): jsPDF {
  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginLeft = 14;
  let y = 20;

  // Title
  doc.setFontSize(16);
  doc.text(config.title, pageWidth / 2, y, { align: "center" });
  y += 7;

  // Store name + date range
  doc.setFontSize(10);
  doc.text(STORE_CONFIG.name, pageWidth / 2, y, { align: "center" });
  y += 5;
  doc.setFontSize(9);
  doc.text(config.dateRange, pageWidth / 2, y, { align: "center" });
  y += 10;

  // Table header
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");

  let x = marginLeft;
  for (const col of config.columns) {
    const textX =
      col.align === "right"
        ? x + col.width - 2
        : col.align === "center"
          ? x + col.width / 2
          : x + 2;
    doc.text(col.header, textX, y, {
      align: col.align || "left",
    });
    x += col.width;
  }

  y += 1;
  doc.setLineWidth(0.3);
  doc.line(marginLeft, y, pageWidth - marginLeft, y);
  y += 4;

  // Table rows
  doc.setFont("helvetica", "normal");
  for (const row of config.rows) {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }

    x = marginLeft;
    for (const col of config.columns) {
      const val = String(row[col.key] ?? "");
      const textX =
        col.align === "right"
          ? x + col.width - 2
          : col.align === "center"
            ? x + col.width / 2
            : x + 2;
      doc.text(val, textX, y, { align: col.align || "left" });
      x += col.width;
    }
    y += 5;
  }

  // Summary
  if (config.summary && config.summary.length > 0) {
    y += 5;
    doc.setLineWidth(0.3);
    doc.line(marginLeft, y, pageWidth - marginLeft, y);
    y += 6;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    for (const item of config.summary) {
      doc.text(item.label, pageWidth - 80, y);
      doc.text(item.value, pageWidth - marginLeft - 2, y, { align: "right" });
      y += 5;
    }
  }

  return doc;
}
