"use client";

import { useState, useMemo } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";
import { SearchInput } from "@/components/shared/search-input";
import { PrintOrderStatusBadge } from "./status-badge";
import {
  formatCurrency,
  formatPrintOrderNumber,
  formatDate,
  formatRelative,
} from "@/lib/utils/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowUpDown, Eye } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "@/lib/i18n/use-translations";

export interface PrintOrder {
  id: string;
  order_number: number;
  customer_name: string;
  customer_phone: string | null;
  service_type: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  status: string;
  is_paid: boolean;
  due_date: string | null;
  created_at: string;
}

interface PrintOrderTableProps {
  orders: PrintOrder[];
}

// STATUS_TABS moved inside component to use translations

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + "...";
}

export function PrintOrderTable({ orders }: PrintOrderTableProps) {
  const t = useTranslations("printOrders");
  const tc = useTranslations("common");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const STATUS_TABS = [
    { value: "all", label: tc.all },
    { value: "registered", label: t.registered },
    { value: "in_progress", label: t.inProgress },
    { value: "ready", label: t.ready },
    { value: "delivered", label: t.delivered },
    { value: "cancelled", label: t.cancelled },
  ] as const;

  const filteredOrders = useMemo(() => {
    let result = orders;

    if (statusFilter !== "all") {
      result = result.filter((o) => o.status === statusFilter);
    }

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (o) =>
          o.customer_name.toLowerCase().includes(q) ||
          formatPrintOrderNumber(o.order_number).toLowerCase().includes(q)
      );
    }

    return result;
  }, [orders, search, statusFilter]);

  const columns: ColumnDef<PrintOrder>[] = [
    {
      accessorKey: "order_number",
      header: t.orderNumber,
      cell: ({ row }) => (
        <span className="font-mono text-sm">
          {formatPrintOrderNumber(row.original.order_number)}
        </span>
      ),
    },
    {
      accessorKey: "customer_name",
      header: t.customer,
    },
    {
      accessorKey: "service_type",
      header: t.service,
      cell: ({ row }) => (
        <Badge variant="secondary">
          {capitalizeFirst(row.original.service_type)}
        </Badge>
      ),
    },
    {
      accessorKey: "description",
      header: tc.description,
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground" title={row.original.description}>
          {truncate(row.original.description, 40)}
        </span>
      ),
    },
    {
      accessorKey: "total_price",
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
          {formatCurrency(row.original.total_price)}
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: t.status,
      cell: ({ row }) => (
        <PrintOrderStatusBadge status={row.original.status} />
      ),
    },
    {
      accessorKey: "is_paid",
      header: t.paymentStatus,
      cell: ({ row }) =>
        row.original.is_paid ? (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            {t.paid}
          </Badge>
        ) : (
          <Badge variant="outline">{t.unpaid}</Badge>
        ),
    },
    {
      accessorKey: "due_date",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {t.dueDateCol}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) =>
        row.original.due_date ? (
          <span className="text-sm">{formatDate(row.original.due_date)}</span>
        ) : (
          <span className="text-muted-foreground">&mdash;</span>
        ),
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {t.createdCol}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {formatRelative(row.original.created_at)}
        </span>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/print-orders/${row.original.id}`}>
            <Eye className="mr-1 h-4 w-4" />
            {tc.view}
          </Link>
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <Tabs
          value={statusFilter}
          onValueChange={setStatusFilter}
          className="w-auto"
        >
          <TabsList>
            {STATUS_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <SearchInput
          placeholder={t.searchPlaceholder}
          value={search}
          onChange={setSearch}
          className="w-64"
        />
      </div>

      <DataTable columns={columns} data={filteredOrders} pageSize={10} />
    </div>
  );
}
