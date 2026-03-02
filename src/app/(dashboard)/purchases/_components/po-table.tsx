"use client";

import { useState, useMemo } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";
import { POStatusBadge } from "./po-status-badge";
import { formatCurrency, formatDate, formatOrderNumber } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, Search, ArrowUpDown } from "lucide-react";
import Link from "next/link";

interface PurchaseOrder {
  id: string;
  po_number: number;
  supplier_id: string;
  suppliers: { name: string } | null;
  status: string;
  subtotal: number;
  total: number;
  expected_date: string | null;
  created_at: string;
}

interface POTableProps {
  purchaseOrders: PurchaseOrder[];
}

export function POTable({ purchaseOrders }: POTableProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return purchaseOrders;
    const q = search.toLowerCase();
    return purchaseOrders.filter(
      (po) =>
        formatOrderNumber(po.po_number).toLowerCase().includes(q) ||
        (po.suppliers?.name && po.suppliers.name.toLowerCase().includes(q))
    );
  }, [purchaseOrders, search]);

  const columns: ColumnDef<PurchaseOrder>[] = [
    {
      accessorKey: "po_number",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          PO #
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <Link
          href={`/purchases/${row.original.id}`}
          className="font-medium hover:underline"
        >
          {formatOrderNumber(row.original.po_number)}
        </Link>
      ),
    },
    {
      id: "supplier",
      header: "Supplier",
      cell: ({ row }) =>
        row.original.suppliers?.name || (
          <span className="text-muted-foreground">Unknown</span>
        ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <POStatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "total",
      header: ({ column }) => (
        <Button
          variant="ghost"
          className="w-full justify-end"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Total
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-right font-medium">
          {formatCurrency(row.original.total)}
        </div>
      ),
    },
    {
      accessorKey: "expected_date",
      header: "Expected",
      cell: ({ row }) =>
        row.original.expected_date ? (
          formatDate(row.original.expected_date)
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Created
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => formatDate(row.original.created_at),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
          <Link href={`/purchases/${row.original.id}`}>
            <Eye className="h-4 w-4" />
          </Link>
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by PO # or supplier..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>
      <DataTable columns={columns} data={filtered} pageSize={20} />
    </div>
  );
}
