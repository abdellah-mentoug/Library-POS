"use client";

import { useState, useMemo } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";
import { formatCurrency } from "@/lib/utils/format";
import { Input } from "@/components/ui/input";
import { ExportButtons } from "../_components/export-buttons";
import { Search, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Product {
  product_id: string;
  product_name: string;
  barcode: string | null;
  category_name: string | null;
  purchase_price: number;
  stock_quantity: number;
  total_sold: number;
  total_revenue: number;
  total_profit: number;
}

interface Props {
  products: Product[];
}

export function ProductPerformanceClient({ products }: Props) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return products;
    const q = search.toLowerCase();
    return products.filter(
      (p) =>
        p.product_name.toLowerCase().includes(q) ||
        (p.category_name && p.category_name.toLowerCase().includes(q)) ||
        (p.barcode && p.barcode.includes(q))
    );
  }, [products, search]);

  const columns: ColumnDef<Product>[] = [
    {
      accessorKey: "product_name",
      header: "Product",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.product_name}</span>
      ),
    },
    {
      accessorKey: "category_name",
      header: "Category",
      cell: ({ row }) =>
        row.original.category_name || (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      accessorKey: "purchase_price",
      header: "Price",
      cell: ({ row }) => formatCurrency(row.original.purchase_price),
    },
    {
      accessorKey: "total_sold",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Sold
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-center">{row.original.total_sold}</div>
      ),
    },
    {
      accessorKey: "total_revenue",
      header: ({ column }) => (
        <Button
          variant="ghost"
          className="w-full justify-end"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Revenue
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-right font-medium">
          {formatCurrency(row.original.total_revenue)}
        </div>
      ),
    },
    {
      accessorKey: "total_profit",
      header: ({ column }) => (
        <Button
          variant="ghost"
          className="w-full justify-end"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Profit
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-right font-medium">
          {formatCurrency(row.original.total_profit)}
        </div>
      ),
    },
    {
      accessorKey: "stock_quantity",
      header: "Stock",
      cell: ({ row }) => (
        <div className="text-center">{row.original.stock_quantity}</div>
      ),
    },
  ];

  const exportRows = filtered.map((p) => ({
    product_name: p.product_name,
    category: p.category_name || "",
    price: p.purchase_price,
    total_sold: p.total_sold,
    total_revenue: p.total_revenue,
    total_profit: p.total_profit,
    stock_quantity: p.stock_quantity,
  }));

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, category, barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <ExportButtons
          headers={[
            "product_name",
            "category",
            "price",
            "total_sold",
            "total_revenue",
            "total_profit",
            "stock_quantity",
          ]}
          rows={exportRows}
          filename="product-performance"
        />
      </div>
      <DataTable columns={columns} data={filtered} pageSize={20} />
    </>
  );
}
