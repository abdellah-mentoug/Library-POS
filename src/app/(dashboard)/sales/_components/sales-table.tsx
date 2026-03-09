"use client";

import { useState, useMemo } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  formatCurrency,
  formatDateTime,
  formatSaleNumber,
} from "@/lib/utils/format";
import { useTranslations } from "@/lib/i18n/use-translations";
import { Eye, Search, ArrowUpDown } from "lucide-react";
import Link from "next/link";

interface Sale {
  id: string;
  sale_number: number;
  total: number;
  payment_method: string;
  status: string;
  created_at: string;
  customers: { name: string } | { name: string }[] | null;
  profiles: { full_name: string } | { full_name: string }[] | null;
}

interface SalesTableProps {
  sales: Sale[];
}

export function SalesTable({ sales }: SalesTableProps) {
  const t = useTranslations("sales");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(() => {
    let result = sales;
    if (statusFilter !== "all") {
      result = result.filter((s) => s.status === statusFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          formatSaleNumber(s.sale_number).toLowerCase().includes(q) ||
          (() => {
            const c = Array.isArray(s.customers) ? s.customers[0] : s.customers;
            return c?.name && c.name.toLowerCase().includes(q);
          })()
      );
    }
    return result;
  }, [sales, search, statusFilter]);

  const columns: ColumnDef<Sale>[] = [
    {
      accessorKey: "sale_number",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {t.saleNumber}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <Link
          href={`/sales/${row.original.id}`}
          className="font-medium hover:underline"
        >
          {formatSaleNumber(row.original.sale_number)}
        </Link>
      ),
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {t.date}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => formatDateTime(row.original.created_at),
    },
    {
      id: "customer",
      header: t.customer,
      cell: ({ row }) => {
        const c = Array.isArray(row.original.customers) ? row.original.customers[0] : row.original.customers;
        return c?.name || <span className="text-muted-foreground">{t.walkIn}</span>;
      },
    },
    {
      id: "cashier",
      header: t.cashier,
      cell: ({ row }) => {
        const p = Array.isArray(row.original.profiles) ? row.original.profiles[0] : row.original.profiles;
        return p?.full_name || <span className="text-muted-foreground">{"\u2014"}</span>;
      },
    },
    {
      accessorKey: "payment_method",
      header: t.payment,
      cell: ({ row }) => (
        <span className="capitalize">{row.original.payment_method}</span>
      ),
    },
    {
      accessorKey: "status",
      header: t.status,
      cell: ({ row }) => (
        <Badge
          variant={
            row.original.status === "completed" ? "default" : "destructive"
          }
          className="capitalize"
        >
          {row.original.status === "completed" ? t.completed : t.voided}
        </Badge>
      ),
    },
    {
      accessorKey: "total",
      header: ({ column }) => (
        <Button
          variant="ghost"
          className="w-full justify-end"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {t.total}
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
      id: "actions",
      cell: ({ row }) => (
        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
          <Link href={`/sales/${row.original.id}`}>
            <Eye className="h-4 w-4" />
          </Link>
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.allStatus}</SelectItem>
            <SelectItem value="completed">{t.completed}</SelectItem>
            <SelectItem value="voided">{t.voided}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <DataTable columns={columns} data={filtered} pageSize={20} />
    </div>
  );
}
