"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";
import { formatCurrency } from "@/lib/utils/format";
import { Badge } from "@/components/ui/badge";
import { ExportButtons } from "../_components/export-buttons";

interface LowStockProduct {
  id: string;
  name: string;
  barcode: string | null;
  sku: string | null;
  stock_quantity: number;
  low_stock_threshold: number;
  selling_price: number | null;
}

interface Props {
  products: LowStockProduct[];
}

export function StockReportClient({ products }: Props) {
  const columns: ColumnDef<LowStockProduct>[] = [
    {
      accessorKey: "name",
      header: "Product",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.name}</span>
      ),
    },
    {
      accessorKey: "barcode",
      header: "Barcode",
      cell: ({ row }) =>
        row.original.barcode || (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      accessorKey: "stock_quantity",
      header: "Current Stock",
      cell: ({ row }) => {
        const qty = row.original.stock_quantity;
        return (
          <Badge
            variant={qty === 0 ? "destructive" : "default"}
            className={
              qty === 0
                ? ""
                : "bg-orange-100 text-orange-800"
            }
          >
            {qty}
          </Badge>
        );
      },
    },
    {
      accessorKey: "low_stock_threshold",
      header: "Threshold",
      cell: ({ row }) => (
        <div className="text-center">{row.original.low_stock_threshold}</div>
      ),
    },
    {
      id: "reorder_qty",
      header: "Suggested Reorder",
      cell: ({ row }) => {
        const needed =
          row.original.low_stock_threshold - row.original.stock_quantity;
        return (
          <div className="text-center font-medium">
            {needed > 0 ? needed : 0}
          </div>
        );
      },
    },
    {
      id: "price",
      header: "Price",
      cell: ({ row }) =>
        row.original.selling_price
          ? formatCurrency(row.original.selling_price)
          : "—",
    },
  ];

  const exportRows = products.map((p) => ({
    name: p.name,
    barcode: p.barcode || "",
    stock_quantity: p.stock_quantity,
    low_stock_threshold: p.low_stock_threshold,
    suggested_reorder: Math.max(0, p.low_stock_threshold - p.stock_quantity),
  }));

  return (
    <>
      <div className="flex justify-end">
        <ExportButtons
          headers={[
            "name",
            "barcode",
            "stock_quantity",
            "low_stock_threshold",
            "suggested_reorder",
          ]}
          rows={exportRows}
          filename="low-stock-report"
        />
      </div>
      {products.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">
          All products are well stocked.
        </p>
      ) : (
        <DataTable columns={columns} data={products} pageSize={50} />
      )}
    </>
  );
}
